import { graphql } from "@octokit/graphql";
import { createTokenAuth } from "@octokit/auth-token";
import core from "@actions/core";
import fs from "fs/promises";
import { load } from "js-yaml";
import path from "path";

const auth = createTokenAuth(process.env.GITHUB_TOKEN);
const { token } = await auth();

const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${token}`,
  }
})

const releasesQuery = `
query($owner: String!, $repository: String!) {
  repository(owner: $owner, name: $repository) {
    releases(last: 100) {
      edges {
        node {
          tagName
          isDraft
          tagCommit {
            oid
          }
        }
      }
    }
  }
}
`

const rootPath = path.resolve(path.dirname(import.meta.url).replace("file://", ""), "..");
const repositoriesPath = path.resolve(rootPath, "repositories");
const historyPath = path.resolve(rootPath, ".history");

Set.prototype.difference = function(setB) {
  var difference = new Set(this);
  for (var elem of setB) {
      if (this.has(elem)) difference.delete(elem);
  }
  return difference;
}

async function parseImageRepositoryConfig(imageRepositoryName) {
  const file = await fs.readFile(path.resolve(repositoriesPath, imageRepositoryName, "config.yaml"));

  return load(file);
}

async function getRepositoryReleaseData(owner, repository) {
  return graphqlWithAuth(releasesQuery, {
      owner: owner,
      repository: repository,
    }
  ).then(response => response.repository.releases.edges.map(r => (
    {
      tagName: r.node.tagName,
      isDraft: r.node.isDraft,
      tagCommit: r.node.tagCommit.oid,
    }
  ))).catch(response => {
    for (const error of response.errors) {
      console.error(error.message);
    }
    process.exit(1);
  });
}

async function getBuiltReleaseData(imageRepositoryName) {
  return (await fs.readdir(path.resolve(historyPath, imageRepositoryName)).catch(() => []));
}

function parseOwnerRepositoryString(ownerRepositoryString) {
  const [owner, repository] = ownerRepositoryString.split("/");
  
  return {
    owner: owner,
    repository: repository,
  }
}

async function getAll(imageRepositoryName) {
  const config = await parseImageRepositoryConfig(imageRepositoryName);
  const { owner, repository } = parseOwnerRepositoryString(config.sourceRepository);

  const [parsedReleases, builtTags] = await Promise.all([
    getRepositoryReleaseData(owner, repository),
    getBuiltReleaseData(imageRepositoryName)
  ]);

  return {
    config: config,
    owner: owner,
    repository: repository,
    parsedReleases: parsedReleases,
    builtTags: builtTags,
  }
}

async function processImageRepository(imageRepositoryName) {
  const { parsedReleases, builtTags, owner, repository } = await getAll(imageRepositoryName);
  const tagsAlreadyBuilt = new Set(builtTags);
  const tagsInRepository = new Set(parsedReleases.map(release => release.tagName));
  const tagsToBuild = tagsInRepository.difference(tagsAlreadyBuilt);

  return {
    owner: owner,
    repository: repository,
    tagsToBuild: tagsToBuild,
  }
}

async function processImageRepositories() {
  return Promise.all(
    await fs.readdir(repositoriesPath).then(r => r.map(processImageRepository))
  );
}

function formatResult(results) {
  return results.flatMap(e => 
    [...e.tagsToBuild].map(tag => ({
        owner: e.owner,
        repository: e.repository,
        tag: tag,
      })
    ))
    .map(r => `${r.owner}/${r.repository},${r.tag}`)
}

const result = formatResult(await processImageRepositories());

core.setOutput("result", result);
