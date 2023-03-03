import core from "@actions/core";
import { API } from "./dockerhub.mjs"

async function createDockerhubRepository(namespace, token, repository) {
    console.log(`Creating repository ${namespace}/${repository}`);
    console.log("Description:");
    console.log(description);

    const config = await readConfig(repository);
    
    const response = await API("POST", "repositories/", {
        namespace: namespace,
        name: repository,
        description: config.description,
        is_private: false,
        registry: "docker",
    }, {
        username: namespace,
        token: token
    });

    switch (response.status) {
        case 201:
            core.info("Repository created successfully");
            break;
        case 400:
            core.info("Repository already exists");
            break;
        default:
            const body = await response.json();
            core.setFailed(body.message);
            break;
    }
}

await createDockerhubRepository(
    core.getInput("username"),
    core.getInput("token"),
    core.getInput("repository")
).catch(error => core.setFailed(error.message));
