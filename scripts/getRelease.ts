import { context, getOctokit } from "@actions/github";
import * as core from "@actions/core";
import { writeFile } from "fs/promises";
import { sourceRepository, releaseDataArtifactPrefix } from "./utils.js";

const token = process.env.TOKEN;
if (!token) throw new Error(JSON.stringify({ token }));

const gh = getOctokit(token).rest;

const sourceRepositoryReleases = await gh.repos.listReleases({
  ...sourceRepository,
  per_page: 5,
});
const thisRepositoryReleases = await gh.repos.listReleases({
  ...context.repo,
  per_page: 5,
});

const openReleases = sourceRepositoryReleases.data.filter(
  (r) => !thisRepositoryReleases.data.find((s) => s.tag_name === r.tag_name)
);
const release = openReleases.at(-1);

if (!release) process.exit(0);

const releaseArtifactName = releaseDataArtifactPrefix + release.id;
await writeFile(releaseArtifactName + ".json", JSON.stringify(release));

core.setOutput("download_url", release?.zipball_url);
core.setOutput("releaseArtifactName", releaseArtifactName);
