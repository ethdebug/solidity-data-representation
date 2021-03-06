const fs = require("fs");
const del = require("del");
const path = require("path");
const { src, dest, task, watch, series } = require('gulp');
const Gitdown = require('@gnd/gitdown');
const rename = require("gulp-rename");
const debug = require("gulp-debug");
const replace = require("gulp-replace");

task('static', async () => {
  if (!fs.existsSync("dist")) {
    fs.mkdirSync("dist");
  }

  await src("static/*").pipe(dest("dist"));
});

task('gitdown', async () => {
  if (!fs.existsSync("dist")) {
    fs.mkdirSync("dist");
  }

  const gitdown = Gitdown.readFile(path.join(__dirname, "src", "index.md"));
  gitdown.setConfig({
    deadlink: {
      findDeadURLs: false,
      findDeadFragmentIdentifiers: true
    },
    gitinfo: {
      rootUrl: "",
      gitPath: gitdown.executionContext()
    }
  });
  gitdown.setLogger(console);

  const contents = {
    ref: "#user-content-contents",
    title: "Back to contents"
  };

  gitdown.registerHelper("scroll-up", {
    compile: (config) => {
      const up = {
        ref: config.upRef || contents.ref,
        title: config.upTitle || contents.title
      };

      const down = {
        ref: config.downRef,
        title: config.downTitle
      };

      if (config.downRef) {
        return `<sup>[ [&and;](${up.ref}) _${up.title}_ | _${down.title}_ [&or;](${down.ref}) ]</sup>`;
      } else {
        return `<sup>[ [&and;](${up.ref}) _${up.title}_ ]</sup>`;
      }
    }
  });

  await gitdown.writeFile('dist/_merged.md');
});

task('fix-up', () => {
  return src("dist/_merged.md")
    .pipe(debug({ title: "merged" }))
    .pipe(rename("index.md"))
    .pipe(replace("# User Content", "# Data Representation in Solidity"))
    .pipe(replace("<a name=\"user-content\"></a>\n", ""))
    .pipe(dest("dist"));
});

task('clean:tmp', () => {
  return del(["dist/_merged.md"]);
});

task('build', series("static", "gitdown", "fix-up", "clean:tmp"));

task('watch', series(["build", () => {
  watch('./src', series(['build']));
}]));


task('default', series('build'));
