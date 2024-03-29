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
query($owner: String!, $repository: String!, $latest: Int = 10) {
  repository(owner: $owner, name: $repository) {
    releases(first: $latest) {
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

async function getRepositoryReleaseData(owner, repository, latest) {
  return graphqlWithAuth(releasesQuery, {
      owner: owner,
      repository: repository,
      latest: latest,
    }
  ).then(response => response.repository.releases.edges.map(r => (
    {
      tagName: r.node.tagName,
      isDraft: r.node.isDraft,
      tagCommit: r.node.tagCommit.oid,
    }
  ))).catch(response => {
    console.log(JSON.stringify(response, null, 2));
    for (const error of response.errors) {
      console.error(error.message);
    }
    core.setFailed(`Failed to get releases for ${owner}/${repository}`);
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
    getRepositoryReleaseData(owner, repository, config.scrape.latest),
    getBuiltReleaseData(imageRepositoryName)
  ]);

  console.log(`Found ${parsedReleases.length} releases for ${owner}/${repository}`);
  console.log(`Found ${builtTags.length} built tags for ${imageRepositoryName}`);

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
  const validTags = parsedReleases
    .map(release => release.tagName)
    .filter(tag => /^[a-zA-Z0-9]+([._-]?[a-zA-Z0-9]+)*$/.test(tag));
  const tagsInRepository = new Set(validTags);
  const tagsToBuild = tagsInRepository.difference(tagsAlreadyBuilt);

  console.log(`Found ${tagsToBuild.size} tags to build for ${owner}/${repository}`);
  console.log(`Tags to build: ${[...tagsToBuild].join(", ")}`);

  return {
    owner: owner,
    repository: repository,
    imageRepository: imageRepositoryName,
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
        source: {
          owner: e.owner,
          repository: e.repository,
          tag: tag,
        },
        image: {
          repository: e.imageRepository,
          tag: tag,
        }
      })
    ))
    .map(JSON.stringify)
}

const result = formatResult(await processImageRepositories());

core.setOutput("result", result);
