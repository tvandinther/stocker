# stocker
**Automated build of container images from tags of external GitHub repositories.**

## About
Every day (0 0 * * *) stocker will iterate through all of the entries in the `repositories` directory and fetch the latest 100 tags from the `sourceRepository` in the `config.yaml`. It will then dispatch a build job for any tags that do not have a corresponding log file in `.history`.

Built images will be pushed to [imagestocker](https://hub.docker.com/u/imagestocker) on Docker Hub.

## To track a new repository:
1. Add a new directory in the `repositories` directory. The name of this directory will be the name of the image repository.
2. Add the following files to the new directory:
    - `config.yaml` - Metadata for stocker to use when processing the entry.
    - `Dockerfile` - The Dockerfile to build the image.
    - `README.md` - The README for the image.
    - `test.bash` - A script to test the image once it is built.

---

## About the files

### `config.yaml`
This is the configuration file containing metadata for stocker to use when processing the entry. It contains the following fields:

| Name | Default | Description |
| ---- | ------- | ----------- |
| `sourceRepository` | **required** | The owner of the source repository. |
| `description` | "" | A short description of the image. |

### `Dockerfile`
This is the Dockerfile that will be used to build the image from the source repository. It will be given the source repository as the build context.

The Dockerfile has the following build arguments available to it:
| Name | Description |
| ---- | ----------- |
| `SOURCE_OWNER` | The owner of the source repository. |
| `SOURCE_REPOSITORY` | The source repository to build the image from. |
| `SOURCE_TAG` | The source tag to build the image from. |
| `IMAGE_REPOSITORY` | The name of the image repository that you are building for. |
| `IMAGE_TAG` | The name of the image tag that you are building for. |

### `README.md`
This is the README for the image. It will be used as the full length description for the image on Docker Hub.

### `test.bash`
This is a script that will be used to test the image once it is built. It will be given the following environment variables:

| Name | Description |
| ---- | ----------- |
| `IMAGE` | The full tag of the image that was built, e.g. `imagestocker/promtool:v2.42.0` |

---

## Repository Setup
The following variables and secrets are required to be set in the repository to allow stocker to function. These are set in the repository settings under `Settings > Secrets and variables > Actions`. If you are using a fork of this repository, you will need to set these in your fork.

### Required Repository Variables:
| Name | Description |
| ---- | ----------- |
| `DOCKERHUB_USERNAME` | Docker Hub username. |

### Required Repository Secrets:
| Name | Description |
| ---- | ----------- |
| `DOCKERHUB_TOKEN` | Docker Hub PAT with read, write & delete scope. |
