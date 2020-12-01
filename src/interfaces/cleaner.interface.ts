/**
 * On log processor type
 */
type OnLogProcessor = (msg: string) => void;

/**
 * Module map interface
 */
export interface ModuleMap {
  name: string;
  packages: PackageModule[];
}

/**
 * Package module
 */
export interface PackageModule {
  packageName: string;
  path: string;
  moduleVersion: string;
}

/**
 * Configuration options
 */
export interface ConfigOptions {
  rootPath: string;
  onLog?: OnLogProcessor;
}
