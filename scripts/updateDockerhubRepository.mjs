import core from "@actions/core";
import fs from "fs/promises";
import { load } from "js-yaml";

const rootPath = path.resolve(path.dirname(import.meta.url).replace("file://", ""), "..");
const repositoriesPath = path.resolve(rootPath, "repositories");

async function updateDockerhubRepository(namespace, repository, fullDescriptionPath) {
    const file = await fs.readFile(path.resolve(repositoriesPath, repository, "config.yaml"));
    const config = load(file);

    const description = config.description;
    const fullDescription = await fs.readFile(fullDescriptionPath, "utf8");
    
    const response = await fetch(`https://hub.docker.com/v2/repositories/${namespace}/${repository}/`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `JWT ${process.env.DOCKERHUB_TOKEN}`
        },
        body: JSON.stringify({
            "registry": "registry-1.docker.io",
            "description": description,
            "full_description": fullDescription,
        })
    });

    switch (response.status) {
        case 200:
            core.info("Repository updated successfully");
            break;
        default:
            const body = await response.json();
            core.setFailed(body.message);
            break;
    }
}

await updateDockerhubRepository(
    process.env.DOCKERHUB_USERNAME,
    process.env.DOCKERHUB_REPOSITORY,
    process.env.DOCKERHUB_FULL_DESCRIPTION
);
