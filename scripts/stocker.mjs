import fs from "fs/promises";
import { load } from "js-yaml";
import path from "path";

export async function readFileFromRepository(repository, file) {
    const rootPath = path.resolve(path.dirname(import.meta.url).replace("file://", ""), "..");
    const repositoriesPath = path.resolve(rootPath, "repositories");

    return await fs.readFile(path.resolve(repositoriesPath, repository, file));
}

export async function readConfig(repository) {
    const file = await readFileFromRepository(repository, "config.yaml");
    return load(file);
}

export async function readREADME(repository) {
    const buffer = await readFileFromRepository(repository, "README.md");
    return buffer.toString();
}

export async function getAllRepositoryNames() {
    const rootPath = path.resolve(path.dirname(import.meta.url).replace("file://", ""), "..");
    const repositoriesPath = path.resolve(rootPath, "repositories");

    return await fs.readdir(repositoriesPath);
}

export async function getRepositoryDirectory(repository) {
    const rootPath = path.resolve(path.dirname(import.meta.url).replace("file://", ""), "..");
    const repositoriesPath = path.resolve(rootPath, "repositories");

    return path.resolve(repositoriesPath, repository);
}