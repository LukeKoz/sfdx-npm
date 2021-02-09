import {JsonMap, JsonArray, ensureJsonMap, ensureJsonArray, ensureString, ensureBoolean} from '@salesforce/ts-types';
import * as project from './project';
import * as fs from 'fs-extra';
import * as path from 'path';
import {ConfigOptions, ModuleMap} from '../interfaces/cleaner.interface';
import {SfdxError} from '@salesforce/core';

/**
 * Clean up duplicate modules across multiple packages.
 * If there are version differences, ensure this is noted.
 */
export default class ModuleCleaner {

  /**
   * SFDX Project
   * @private
   * @readonly
   */
  private readonly sfdxProject: JsonMap;

  /**
   * Module information
   * @private
   */
  private modules: { [key: string]: ModuleMap } = {};

  /**
   * The number of modules removed
   * @private
   */
  private removedCount = 0;

  /**
   * Options applied from the constructor
   * @private
   */
  private options: ConfigOptions;

  /**
   * Constructor
   */
  constructor(options?: ConfigOptions) {
    this.options = Object.assign({
      rootPath: process.cwd()
    }, options);

    this.sfdxProject = project.getSfdxProject(this.options.rootPath);
  }

  /**
   * List of packages from the sfdx project
   */
  get packages(): JsonArray {
    this.log('ModuleCleaner.packages');
    return ensureJsonArray(this.sfdxProject.packageDirectories);
  }

  /**
   * Get the default package
   */
  get defaultPackage(): JsonMap {
    this.log('ModuleCleaner.defaultPackage');
    return ensureJsonMap(ensureJsonArray(this.packages).find((pkg: JsonMap): boolean => ensureBoolean(pkg.default)));
  }

  /**
   * Get the dependency packages
   */
  get dependencies(): JsonArray {
    this.log('ModuleCleaner.dependencies');
    return ensureJsonArray(project.getDependencies(this.sfdxProject));
  }

  /**
   * Clean the node modules across all packages
   */
  public clean(): void {
    this.log('Fetching all package modules...');

    // Get all the modules and identify the packages using them
    this.getAllModules();

    // Validate the versions for each package
    this.validateVersions();

    // Remove duplicate node modules by deciding which package deserves it most
    this.removeDuplicates();

    this.log('Finished cleaning modules!');
  }

  /**
   * Count the total number of installed modules
   */
  public countInstalled(): number {
    return Object.keys(this.modules).length;
  }

  /**
   * Count the number of duplicates removed
   */
  public countRemoved(): number {
    return this.removedCount;
  }

  /**
   * Ensure all instances of each node module is of the same version and recommend next actions.
   * Salesforce does not support the use of different versions of modules so they must match.
   * @private
   */
  private validateVersions(): void {
    Object.values(this.modules).forEach(module => {
      // No checks required for modules where in use for one package only
      if (module.packages.length <= 0) {
        return;
      }

      if (module.packages.length > 1) {
        // Check all versions are the same
        const version: string = module.packages[0].moduleVersion;
        const mismatchedVersions = module.packages.filter(pkg => pkg.moduleVersion !== version);
        const errors = module.packages.map(v => {
          const packagePath = v.path.substring(v.path.indexOf('node_modules') + 'node_modules'.length + 1);
          return v.packageName + ': ' + v.moduleVersion + ' (' + packagePath + ')';
        });

        if (mismatchedVersions.length > 0) {
          throw new SfdxError(`Mismatched versions for node module: ${module.name}

${errors.join('\n')}

You must ensure all versions are the same across all dependencies.

To update the versions run the following command: "sfdx npm:version:match ${module.name}"`);
        }
      }
    });
  }

  /**
   * Identify the packages which deserve the node modules most, and remove the duplicates
   * from the other packages. The deserving packages are determined by whether the module
   * is used already elsewhere.
   * @private
   */
  private removeDuplicates(): void {
    Object.values(this.modules).forEach(module => {
      if (module.packages.length > 1) {
        const packageNames = module.packages.map(pkg => pkg.packageName);
        let winner: JsonMap;

        // Set the winner to the default package
        winner = ensureJsonMap(this.packages.find((pkg: JsonMap): boolean => pkg.default && packageNames.includes(ensureString(pkg.package))));

        // Set the winner to a dependency if also using the package
        const depWithModule: JsonMap = ensureJsonMap(this.dependencies.find((pkg: JsonMap): boolean => packageNames.includes(ensureString(pkg.package))));
        if (depWithModule) {
          winner = depWithModule;
        }

        // If there is a winner, remove all other instances of the module elsewhere
        if (winner) {
          // Find packages to remove the module for
          this.packages.forEach((pkg: JsonMap) => {
            const remove = packageNames.includes(ensureString(pkg.package))
              && pkg.package !== winner.package;

            // Remove the module
            if (remove) {
              const modulePath = path.resolve(this.options.rootPath, ensureString(pkg.path), 'node_modules', module.name);
              fs.removeSync(modulePath);
              this.log(`Removed package from "${pkg.package}": ${module.name}`);
              this.removedCount++;
            }
          });
        }
      }
    });
  }

  /**
   * Get modules across all packages
   */
  private getAllModules() {
    this.packages.forEach((pkg: JsonMap) => {
      const packagePath: string = ensureString(pkg.path);
      const rootPath = path.resolve(this.options.rootPath, packagePath, 'node_modules');

      if (!fs.existsSync(rootPath)) {
        this.log(`Modules path not found for package: ${packagePath}`);
        return;
      }

      this.identifyInstalledModules(pkg, rootPath);
    });
  }

  /**
   * Recursively identify installed node modules to prevent duplicate installations
   * of the same package regardless of which version is installed. Collect the versions
   * installed and their locations, and report on the issue.
   */
  private identifyInstalledModules(pkg: JsonMap, currentPath: string): void {
    const packageJsonPath = path.resolve(currentPath, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      const moduleDetail = JSON.parse(fs.readFileSync(packageJsonPath));

      let module = this.modules[moduleDetail.name];

      if (!module) {
        module = {
          name: moduleDetail.name,
          packages: []
        };
      }

      module.packages.push({
        packageName: ensureString(pkg.package),
        path: currentPath,
        moduleVersion: moduleDetail.version
      });

      this.modules[moduleDetail.name] = module;
    }

    // Recursively identify install modules in sub-directories
    const dirs = fs.readdirSync(currentPath);
    dirs.forEach(dir => {
      if ( !dir.includes('.') ) {
        this.identifyInstalledModules(pkg, path.resolve(currentPath, dir));
      }
    });
  }

  /**
   * Log a message to the CLI
   */
  private log(msg: string): void {
    if (this.options.onLog) {
      this.options.onLog(msg);
    }
  }
}
