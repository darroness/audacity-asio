import { getOctokit, context } from "@actions/github";
import { randomBytes } from "crypto";
import { releaseDataArtifactPrefix, sourceRepository } from "./utils.js";

const token = process.env.TOKEN;
const run_id = process.env.RUN_ID;
if (!token || !run_id) throw new Error(JSON.stringify({ token, run_id }));

const gh = getOctokit(token).rest;
const artifacts = await gh.actions.listWorkflowRunArtifacts({
  ...context.repo,
  run_id: +run_id,
});

const releaseId = artifacts.data.artifacts
  .find((a) => a.name.startsWith(releaseDataArtifactPrefix))
  ?.name.replace(releaseDataArtifactPrefix, "");
if (!releaseId) process.exit(0);

const release = await gh.repos.getRelease({
  ...sourceRepository,
  release_id: +releaseId,
});

const newRelease = await gh.repos.createRelease({
  ...context.repo,
  tag_name: release.data.tag_name,
  name: release.data.name ?? "",
  body: release.data.body + "\n\n - Added Asio Support",
  draft: release.data.draft,
  prerelease: release.data.prerelease,
});

await Promise.allSettled(
  artifacts.data.artifacts.map(async (artifact) => {
    let name = artifact.name
      .replaceAll("audacity", "audacity-asio")
      .replaceAll("unknown", randomBytes(4).toString("hex"));
    if (name.includes("beta")) name += "-portable";

    const data = await gh.actions.downloadArtifact({
      ...context.repo,
      artifact_id: artifact.id,
      archive_format: "zip",
    });
    gh.repos.uploadReleaseAsset({
      ...context.repo,
      release_id: newRelease.data.id,
      name: name + ".zip",
      data: data.data as string,
    });
  })
);
