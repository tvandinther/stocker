import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';
import { readFileFromRepository, readConfig, getAllRepositoryNames } from './stocker.mjs'
import core from '@actions/core';

const repositories = await getAllRepositoryNames();

const configSchema = z.object({
    sourceRepository: z.string(),
    description: z.string(),
    scrape: z.object({
        latest: z.number().positive().lte(50),
    }).strict().optional(),
}).strict();

async function validateRepositoryFiles() {
    for (const repository of repositories) {
        const expectedFiles = ["Dockerfile", "README.md", "test.bash"];
        const errors = await Promise.all([
            validateConfig(repository), 
            ...expectedFiles.map(file => safeReadFileFromRepository(repository, file))
        ]).then(x => x.filter(Boolean));
    
        if (errors.some(error => error !== null)) {
            infoError(`Invalid repository: ${repository}`);
            errors.forEach(error => core.setFailed(error));
        }
        else {
            infoSuccess(`Validated ${repository}`);
        }
    }
}

async function safeReadFileFromRepository(repository, file) {
    return await readFileFromRepository(repository, file)
        .then(_ => null)    
        .catch(_ => missingFileError(repository, file));
}

async function validateConfig(repository) {
    return await readConfig(repository)
        .then(config => {
            const { success, error } = configSchema.safeParse(config);
            if (!success) {
                return `Malformed config.yaml: ${fromZodError(error, { prefix: null, prefixSeparator: "" })}`
                // repositoryInError(repository, `Malformed config.yaml: ${fromZodError(error, { prefix: null, prefixSeparator: "" })}`);
            }
            
            return null;
        })
        .catch(_ => missingFileError(repository, "config.yaml"));
}

function missingFileError(repository, file) {
    return `Expected ${file} to exist in repository directory: repositories/${repository}`;
}

function infoSuccess(message) {
    core.info(`\x1b[42m\x1b[30m ${message} \x1b[0m`);
}

function infoError(message) {
    core.info(`\x1b[41m\x1b[30m ${message} \x1b[0m`);
}

await validateRepositoryFiles().catch(error => core.setFailed(error.message));