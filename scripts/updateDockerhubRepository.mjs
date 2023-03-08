import core from "@actions/core";
import { API } from "./dockerhub.mjs";
import { readConfig, readREADME } from "./stocker.mjs";

async function updateDockerhubRepository(namespace, token, repository, fullDescriptionPath) {
    console.log(`Updating repository ${namespace}/${repository}`);
    console.log(`Full description path: ${fullDescriptionPath}`)
    
    const config = await readConfig(repository);

    console.log("With config:");
    console.log(JSON.stringify(config, null, 2));

    const fullDescription = await readREADME(repository);
    
    const response = await API("PATCH", `repositories/${namespace}/${repository}/`, {
        "description": config.description,
        "full_description": fullDescription,
    }, {
        username: namespace,
        token: token
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
    core.getInput("username"),
    core.getInput("token"),
    core.getInput("repository"),
    core.getInput("full_description_path")
).catch(error => core.setFailed(error.message));
