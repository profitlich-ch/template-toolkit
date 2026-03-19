import ftp from 'basic-ftp';
import dotenv from 'dotenv';
import { glob } from 'glob';
import path from 'path';
import fs from 'fs/promises';
import readline from 'readline';
import cliProgress from 'cli-progress';

// Helper for making sure the upload progress bars go to 100%
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function isNewer(client, localFile, remotePath) {
    const localStat = await fs.stat(localFile);
    try {
        const remoteDate = await client.lastMod(remotePath);
        return localStat.mtimeMs > remoteDate.getTime();
    } catch {
        // File doesn't exist remotely (550) or server doesn't support MDTM — upload it
        return true;
    }
}

async function createClient(accessOptions) {
    const client = new ftp.Client();
    client.ftp.verbose = false;
    await client.access(accessOptions);
    client.ftp.socket.setKeepAlive(true, 10000);
    return client;
}

export async function runDeploy(mode, uploadTasks, options = {}) {
    const parallel = options.parallel ?? 3;
    const modeUpper = mode.toUpperCase();

    const accessOptions = {
        host: process.env[`FTP_HOST_${modeUpper}`],
        user: process.env[`FTP_USER_${modeUpper}`],
        password: process.env[`FTP_PASSWORD_${modeUpper}`],
        secure: true
    };

    const mainClient = new ftp.Client();
    mainClient.ftp.verbose = false;
    let activeProgressBar = null;

    try {
        console.log(`🚀 Starting deployment for: ${modeUpper}`);

        await mainClient.access(accessOptions);
        mainClient.ftp.socket.setKeepAlive(true, 10000);

        for (const task of uploadTasks) {
            console.log(`\nProcessing Task: ${task.name}`);

            const files = await glob(task.localPattern, {
                nodir: true,
                dot: true,
                ignore: task.ignore
            });

            if (files.length === 0) {
                console.log('No files found for this task.');
                continue;
            }

            // Determine which files are newer than their remote counterparts
            process.stdout.write(`  Checking ${files.length} files...`);
            const filesToUpload = [];

            if (parallel <= 1) {
                for (const file of files) {
                    const relativeFile = path.relative(task.localBase, file);
                    const remotePath = path.join(task.remoteDir, relativeFile).replace(/\\/g, '/');
                    if (await isNewer(mainClient, file, remotePath)) {
                        filesToUpload.push({ file, remotePath });
                    }
                }
            } else {
                const checkWorkerCount = Math.min(parallel, files.length);
                const checkWorkers = await Promise.all(
                    Array.from({ length: checkWorkerCount }, () => createClient(accessOptions))
                );
                const checkQueue = [...files];
                await Promise.all(checkWorkers.map(async (workerClient) => {
                    try {
                        while (true) {
                            const file = checkQueue.shift();
                            if (!file) break;
                            const relativeFile = path.relative(task.localBase, file);
                            const remotePath = path.join(task.remoteDir, relativeFile).replace(/\\/g, '/');
                            if (await isNewer(workerClient, file, remotePath)) {
                                filesToUpload.push({ file, remotePath });
                            }
                        }
                    } finally {
                        workerClient.close();
                    }
                }));
            }

            process.stdout.write(` ${filesToUpload.length} changed.\n`);

            if (filesToUpload.length === 0) {
                console.log('  All files are up to date, skipping.');
                continue;
            }

            const progressBar = new cliProgress.SingleBar({
                format: '  Upload |{bar}| {percentage}%   {value}/{total} files   {duration_formatted}',
                barCompleteChar: '█',
                barIncompleteChar: '░',
                hideCursor: true
            });

            activeProgressBar = progressBar;
            progressBar.start(filesToUpload.length, 0);

            if (parallel <= 1) {
                for (const { file, remotePath } of filesToUpload) {
                    await mainClient.ensureDir(path.dirname(remotePath));
                    await mainClient.uploadFrom(file, remotePath);
                    progressBar.increment();
                }
            } else {
                // Pre-create all required remote directories with the main client
                const uniqueDirs = [...new Set(filesToUpload.map(({ remotePath }) => path.dirname(remotePath)))];
                for (const dir of uniqueDirs) {
                    await mainClient.ensureDir(dir);
                }

                // Spawn parallel worker connections
                const workerCount = Math.min(parallel, filesToUpload.length);
                const workers = await Promise.all(
                    Array.from({ length: workerCount }, () => createClient(accessOptions))
                );

                const queue = [...filesToUpload];
                await Promise.all(workers.map(async (initialWorkerClient) => {
                    let workerClient = initialWorkerClient;
                    try {
                        while (true) {
                            const item = queue.shift();
                            if (!item) break;
                            let retries = 0;
                            while (true) {
                                try {
                                    await workerClient.uploadFrom(item.file, item.remotePath);
                                    break;
                                } catch (err) {
                                    retries++;
                                    workerClient.close();
                                    if (retries >= 3) throw err;
                                    await delay(1000 * retries);
                                    workerClient = await createClient(accessOptions);
                                }
                            }
                            progressBar.increment();
                        }
                    } finally {
                        workerClient.close();
                    }
                }));
            }

            activeProgressBar.stop();
            activeProgressBar = null;
            await delay(50);
        }

        console.log('\n✅ Deployment completed successfully!');

    } catch (err) {
        if (activeProgressBar) {
            activeProgressBar.stop();
        }
        console.error('Deployment failed:', err);
    } finally {
        mainClient.close();
    }
}

/**
 * Run the deploy script.
 * @param {Array} uploadTasks - array of { name, localPattern, localBase, remoteDir, ignore? }
 * @param {Object} options - { parallel: number } (default: { parallel: 3 })
 */
export function run(uploadTasks, options = {}) {
    const mode = process.argv[2];
    if (!mode || (mode !== 'staging' && mode !== 'production')) {
        console.error('Error: a mode needs to be given, either "staging" or "production"');
        process.exit(1);
    }

    dotenv.config();

    // In production mode prompt for confirmation
    if (mode === 'production') {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question('🔴 Do you really want to deploy to PRODUCTION? Type "yes" for confirmation: ', (answer) => {
            rl.close();
            if (answer.toLowerCase() === 'yes') {
                console.log('Confirmed. Starting upload...');
                runDeploy(mode, uploadTasks, options);
            } else {
                console.log('❌ Deployment aborted.');
                process.exit(0);
            }
        });
    // In all other modes run deploy without prompt
    } else {
        runDeploy(mode, uploadTasks, options);
    }
}
