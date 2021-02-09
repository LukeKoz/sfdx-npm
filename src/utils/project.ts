import {Messages, SfdxError} from '@salesforce/core';
import * as fs from 'fs-extra';
import * as path from 'path';
import {JsonMap, JsonCollection, ensureJsonArray, ensureJsonMap, ensureString} from '@salesforce/ts-types';

// Import messages
Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('sfdx-npm', 'install');

/**
 * Get the sfdx-project json file for this project
 */
const getSfdxProject = (rootPath?: string): JsonMap => {
  const filePath = path.resolve(rootPath || process.cwd(), 'sfdx-project.json');
  if (!fs.existsSync(filePath)) {
    throw new SfdxError(messages.getMessage('missingPackageJson', [filePath]));
  }

  return JSON.parse(fs.readFileSync(filePath));
};

/**
 * Get the packages that match the dependencies of the default package
 * @param sfdxProject
 */
const getDependencies = (sfdxProject: JsonMap): JsonCollection => {
  console.log('project.getDependencies(0)');
  const packageDirectories: JsonCollection = ensureJsonArray(sfdxProject.packageDirectories);

  const defaultPackage: JsonMap = ensureJsonMap(packageDirectories.find((pkg: JsonMap) => pkg.default));

  console.log('project.getDependencies(1)');
  return ensureJsonArray(defaultPackage.dependencies || []).map((dep: JsonMap) => {
    const packageName = ensureString(dep.package).split('@')[0];
    return packageDirectories.find((pkg: JsonMap) => packageName === pkg.package);
  });
};

// Export modules
export {
  getSfdxProject,
  getDependencies
};
