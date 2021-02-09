import {flags, SfdxCommand} from '@salesforce/command';
import {Messages, SfdxError} from '@salesforce/core';
import {JsonMap, JsonCollection, ensureBoolean, ensureString, ensureJsonArray, ensureJsonMap} from '@salesforce/ts-types';
import * as proc from 'child_process';
import cli from 'cli-ux';
import * as fs from 'fs-extra';
import * as path from 'path';
import ModuleCleaner from '../../utils/ModuleCleaner';

// Lib
import * as project from '../../utils/project';

// Import messages
Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('sfdx-npm', 'install');

/**
 * Install NPM module command class
 */
export default class Install extends SfdxCommand {

  /**
   * Description of the command
   */
  public static description = messages.getMessage('commandDescription');

  /**
   * Examples
   */
  public static examples = [
    `$ sfdx npm:install --save sf-chart-builder
  Installing sf-chart-builder...
  `
  ];

  public static args = [{name: 'module', force: true}];

  /**
   * Command flags
   * @protected
   */
  protected static flagsConfig = {
    save: flags.boolean({char: 's', description: messages.getMessage('saveFlagDescription')})
  };

  // Requires a project workspace
  protected static requiresProject = true;

  /**
   * SFDX Project
   */
  public sfdxProject: JsonMap;

  /**
   * Root path of the project (where sfdx-project.json sits)
   */
  public rootPath: string;

  /**
   * A record of all log outputs
   */
  public outputs = [];

  /**
   * Run the command
   */
  public async run(): Promise<JsonMap> {
    // Get the sfdx project
    this.sfdxProject = project.getSfdxProject();
    if (!this.sfdxProject.packageDirectories) {
      throw new SfdxError(messages.getMessage('invalidSfdxProject'));
    }

    this.rootPath = process.cwd();

    // Install modules(s)
    if (this.args.module) {
      await this.installModule(this.args.module);
    } else {
      await this.installAllModules();
    }

    // Clean modules
    const cleaner = new ModuleCleaner({
      rootPath: this.rootPath,
      onLog: (msg: string): void => this.log(msg)
    });
    cleaner.clean();

    return {
      installTotal: cleaner.countInstalled(),
      removedTotal: cleaner.countRemoved(),
      logs: this.outputs
    };
  }

  /**
   * Output a log message
   */
  public log(message: string) {
    if (!this.flags.nolog) {
      this.outputs.push(message);
      this.ux.log(message);
    }
  }

  /**
   * Install a specific module
   */
  public async installModule(module: string): Promise<void> {
    /**
     * If we are installing a specific node module, prompt the user to specify the package to install into
     */
    this.log('install.installModule[0]');
    const packageDirectories: JsonCollection = ensureJsonArray(this.sfdxProject.packageDirectories);
    const defaultPackage: JsonMap = ensureJsonMap(packageDirectories.find((pkg: JsonMap) => pkg.default));

    /**
     * User Prompt:   Package to install the module into
     * Valid Entries: Package name, full path or final path name
     */
    let installInto = await cli.prompt('Which package do you want to install this into', {
      default: ensureString(defaultPackage.package)
    });
    installInto = installInto ? installInto.toLowerCase() : null;

    // Find the package
    this.log('install.installModule[1]');
    const installingInto: JsonMap = ensureJsonMap(packageDirectories.find((pkg: JsonMap): boolean => {
      if (!installInto) {
        return ensureBoolean(pkg.default);
      } else if (installInto) {
        const packagePath = ensureString(pkg.path).toLowerCase();
        const packagePaths = packagePath.split('/');

        return installInto === ensureString(pkg.package).toLowerCase()
          || installInto === packagePath
          || installInto === packagePaths[packagePaths.length - 1];
      }
    }));

    if (!installingInto) {
      throw new SfdxError(messages.getMessage('invalidPackageForInstall', [installInto]));
    }

    const fullPath = path.resolve(this.rootPath, ensureString(installingInto.path));

    // Change directory to the path to install into
    process.chdir(fullPath);

    // Install the node module into the specified package
    await this.runInstall(fullPath, module);
  }

  /**
   * Install all modules specified in the package.json files for each package
   */
  public async installAllModules(): Promise<void> {
    this.log('install.installAllModules');
    for (let pkg of ensureJsonArray(this.sfdxProject.packageDirectories)) {
      pkg = ensureJsonMap(pkg);
      await this.runInstall(path.resolve(this.rootPath, ensureString(pkg.path)));
    }
  }

  /**
   * Install node modules for a specific path if package.json exists
   * @param packagePath
   * @param module
   */
  public async runInstall(packagePath: string, module?: string): Promise<void> {
    // Does the package.json file exist?
    const filePath = path.resolve(packagePath, 'package.json');

    if (fs.existsSync(filePath)) {
      // Change directory to package path
      process.chdir(packagePath);

      this.log(`Running npm install for path: ${packagePath}`);

      // Install the node modules
      await this.npmInstall(module);
    } else {
      this.log(`No package.json file found in path: ${packagePath}`);
    }
  }

  /**
   * Run the NPM install command on the current working directory
   */
  public async npmInstall(module?: string): Promise<void> {
    const processFlags = [
      module
    ];
    Object.keys(this.flags)
      .filter(flag => Object.keys(Install.flagsConfig).includes(flag))
      .forEach(flag => {
        if (typeof this.flags[flag] === 'boolean' && this.flags[flag]) {
          processFlags.push((flag.length > 1 ? '--' : '-') + flag);
        } else {
          processFlags.push(flag);
          processFlags.push(this.flags[flag]);
        }
      });

    return new Promise((resolve, reject) => {
      try {
        this.log('npm install ' + processFlags.join(' '));

        const child = proc.spawn('npm install', processFlags, {
          cwd: process.cwd(),
          // stdio: 'inherit',
          shell: true
        });

        child.stdout.on('data', message => {
          this.log('message: ' + message.toString());
        });

        child.on('exit', (code, signal) => {
          this.log('Proc exit!');
          resolve();
        });

        child.stderr.on('error', err => {
          throw new SfdxError(err.toString());
        });
      } catch (e) {
        throw new SfdxError(e?.message || e);
      }
    });
  }
}
