import core from "@actions/core";

async function createDockerhubRepository(namespace, repository, description) {
    const response = await fetch("https://hub.docker.com/v2/repositories/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": `JWT ${process.env.DOCKERHUB_TOKEN}`
        },
        body: JSON.stringify({
            "namespace": namespace,
            "name": repository,
            "description": description,
            "is_private": false,
            "registry": "docker",
        })
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
    process.env.DOCKERHUB_USERNAME,
    process.env.DOCKERHUB_REPOSITORY,
    process.env.DOCKERHUB_DESCRIPTION
);
