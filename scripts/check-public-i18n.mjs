import fs from "node:fs";
import { pathToFileURL } from "node:url";

export const publicNamespaces = [
  "common",
  "publicCommon",
  "publicLanding",
  "booking",
  "confirmation",
  "chatbot",
  "publicError",
];
function flatten(object, prefix = "") {
  return Object.entries(object ?? {}).flatMap(([key, value]) =>
    value && typeof value === "object"
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  );
}
export function checkPublicTranslations(en, ta) {
  const select = (dictionary) =>
    Object.fromEntries(publicNamespaces.map((key) => [key, dictionary[key]]));
  const english = flatten(select(en));
  const tamil = flatten(select(ta));
  return {
    missing: english.filter((key) => !tamil.includes(key)),
    extra: tamil.filter((key) => !english.includes(key)),
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const read = (lang) =>
    JSON.parse(
      fs.readFileSync(
        new URL(`../src/locales/${lang}.json`, import.meta.url),
        "utf8",
      ),
    );
  const result = checkPublicTranslations(read("en"), read("ta"));
  if (result.missing.length || result.extra.length) {
    console.error(result);
    process.exitCode = 1;
  } else
    console.log(
      "All public translation keys match (including chatbot and error pages).",
    );
}
