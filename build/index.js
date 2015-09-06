'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _path2 = require('path');

var _path3 = _interopRequireDefault(_path2);

var _cliColor = require('cli-color');

var _cliColor2 = _interopRequireDefault(_cliColor);

/**
 * Module Loader.
 * @namespace moduleloader
 */
var ModuleLoader = {
    /**
     * @var {Object} paths - The base paths.
     */
    paths: {
        base: _path3['default'].join(__dirname, '../'),
        packageFile: _path3['default'].join(__dirname, '../', 'package.json'),
        nodeModules: _path3['default'].join(__dirname, '../', 'node_modules'),
        es6Modules: _path3['default'].join(__dirname, '../', 'es6_modules')
    },

    /**
     * Perform some magic.
     * @function
     */
    execute: function execute() {
        this.packageFile = this.getPackage(this.paths.base, true);

        this.mentionedInPackageFile = this.getAllFromPackageFile(this.packageFile);

        // Collect all the names of es6 packages.
        this.esPackages = this.getAllPackages(this.mentionedInPackageFile);

        // Move all the packages into es6_modules.
        this.movePackages(this.esPackages);

        // Create the redirect file.
        this.createRedirectForPackages(this.esPackages);
    },

    /**
     * Reverse our magic.
     * @function
     */
    reverse: function reverse() {
        var _packages = this.getPackagesForReverse();

        // Remove all the redirect packages from node_modules.
        this.removePackagesFromNodeModules(_packages);

        // Move all the packages back into node_modules.
        this.movePackagesBack(_packages);

        // Remove the es6_modules directory.
        this.removeEsModulesDirectory();
    },

    /**
     * Get the package.json file.
     * @param  {String} path        - The path to the parent directory of the package.json file.
     * @param  {Boolean} throwError - Throw an error when the package.json file can't be found.
     * @return {Object} The package.json contents.
     */
    getPackage: function getPackage(path) {
        var throwError = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

        var file = undefined,
            json = undefined;

        path = _path3['default'].join(path, 'package.json');

        // Get the package.json file.
        try {
            file = _fsExtra2['default'].readFileSync(path, 'utf-8');
        } catch (error) {
            if (throwError) {
                throw new Error("es2015: We can't find the package.json file!");
            }
            return false;
        }

        // Convert the package.json to an Object.
        try {
            json = JSON.parse(file);
        } catch (error) {
            if (throwError) {
                throw new Error("es2015: Your package.json file is not valid json!");
            }
            return false;
        }

        return json;
    },

    /**
     * Get all the packages that are es6.
     * @param  {Object} fromPackageFile - A list with all the packages mentioned in the projects package.json file (uses es6Dependencies)
     * @return {Array} All the packages that meet the requirements for an es6 package.
     */
    getAllPackages: function getAllPackages(fromPackageFile) {
        var _this = this;

        var _modules = this.getAllNodeModules();

        // Check all the package files.
        var _paths = [];
        _modules = _modules.forEach(function (_module) {
            var _result = _this.checkModuleForEs(_module, fromPackageFile);
            if (_result) {
                _paths.push(_result);
            }
        });

        return _paths;
    },

    /**
     * Get the names of all the node_modules directories.
     * @return {Array} All the node_modules names.
     */
    getAllNodeModules: function getAllNodeModules() {
        if (!_fsExtra2['default'].existsSync(this.paths.nodeModules)) {
            return [];
        }
        var _modules = _fsExtra2['default'].readdirSync(this.paths.nodeModules);

        // Filter.
        _modules = _modules.filter(function (_module) {
            return !_module.match(/^\..*/g);
        });
        return _modules;
    },

    /**
     * Check if the package is es6.
     * @param  {String} module - The name of the module.
     * @return {Boolean | Object} Object - the module/package name and the main path from the pacakge.json file.
     */
    checkModuleForEs: function checkModuleForEs(module) {
        var _path = _path3['default'].join(this.paths.nodeModules, module);
        var _pkg = this.getPackage(_path);

        // Required.
        if (!_pkg) {
            return false;
        }

        if (_pkg.es6Replaced) {
            return false;
        }

        // Only one is requied.
        var _mainPath = false;

        if (_pkg.es6) {
            _mainPath = _pkg.es6;
        }

        if (this.mentionedInPackageFile[module]) {
            _mainPath = this.mentionedInPackageFile[module];
        }

        if (_mainPath === false) {
            return false;
        }

        return _defineProperty({}, module, _mainPath);
    },

    /**
     * Move all the packages from node_modules to es6_modules.
     * @param  {Array} packages - All the package names.
     */
    movePackages: function movePackages(packages) {
        var _this2 = this;

        if (!_fsExtra2['default'].existsSync(this.paths.es6Modules)) {
            _fsExtra2['default'].mkdir(this.paths.es6Modules);
        }

        packages.forEach(function (_packageObject) {
            var _package = Object.keys(_packageObject)[0];
            var _currentPath = _path3['default'].join(_this2.paths.nodeModules, _package);
            var _newPath = _path3['default'].join(_this2.paths.es6Modules, _package);

            if (!_fsExtra2['default'].existsSync(_currentPath)) {
                return false; // The module is already moved.
            }
            _fsExtra2['default'].renameSync(_currentPath, _newPath);
        });
    },

    /**
     * Create a redirect from node_modules to es6_modules for all the es6 packages.
     * @param  {Array} packages - All the package names and main paths.
     */
    createRedirectForPackages: function createRedirectForPackages(packages) {
        var _this3 = this;

        packages.forEach(function (_packageObject) {
            var _package = Object.keys(_packageObject)[0];
            var _mainPath = _packageObject[_package];
            var _oldPath = _path3['default'].join(_this3.paths.nodeModules, _package);
            var _currentPath = _path3['default'].join(_this3.paths.es6Modules, _package);

            // Generate a package.json and a index.js file.
            var _indexFile = _this3.generateIndexFile(_package, _mainPath);
            var _packageFile = _this3.generatePackageFile(_package);

            // Create the directory.
            _fsExtra2['default'].mkdirSync(_oldPath);

            // Create the package.json file.
            _fsExtra2['default'].writeFileSync(_oldPath + '/package.json', _packageFile);

            // Create the redirect index.js file.
            _fsExtra2['default'].writeFileSync(_oldPath + '/index.js', _indexFile);
        });
    },

    /**
     * Generate the redirect index.js file.
     * @param  {String} module   - The name of the module.
     * @param  {String} mainPath - The path to the execute/main file.
     * @return {String} The redirect index.js contents.
     */
    generateIndexFile: function generateIndexFile(pkg, mainPath) {
        var _path = _path3['default'].join('../../', 'es6_modules', pkg, mainPath);
        var _file = "module.exports = require('" + _path + "');";
        return _file;
    },

    /**
     * Generate the package.json file.
     * @param  {String} pkg - The name of the module.
     * @return {String} The contents of the new package.json.
     */
    generatePackageFile: function generatePackageFile(pkg) {
        var _object = {
            name: pkg,
            main: 'index.js',
            es6Replaced: true
        };
        return JSON.stringify(_object);
    },

    /**
     * Get all the modules from the project/main package.json file.
     * @param  {Object} pkg - A package.json file.
     * @return {Object} All the es6Dependencies.
     */
    getAllFromPackageFile: function getAllFromPackageFile(pkg) {
        if (!(pkg && pkg.es6Dependencies)) {
            return {}; // No packages found in the package.json file.
        }
        return pkg.es6Dependencies;
    },

    /**
     * Get all the packages that need to be reversed.
     * @return {Array} All the packages that need to be reversed.
     */
    getPackagesForReverse: function getPackagesForReverse() {
        var _this4 = this;

        var _packages = this.getAllNodeModules();

        _packages = _packages.filter(function (_package) {
            var _path = _path3['default'].join(_this4.paths.nodeModules, _package);
            var _pkg = _this4.getPackage(_path);

            if (!_pkg) {
                return false;
            }

            if (_pkg.es6Replaced) {
                return true;
            }

            return false;
        });
        return _packages;
    },

    /**
     * Remove the redirect packages from node_modules.
     * @param  {Array} packages - All the packages that need to be reversed.
     */
    removePackagesFromNodeModules: function removePackagesFromNodeModules(packages) {
        var _this5 = this;

        packages.forEach(function (_package) {
            var _path = _path3['default'].join(_this5.paths.nodeModules, _package);

            if (!_fsExtra2['default'].existsSync(_path)) {
                return;
            }

            _fsExtra2['default'].removeSync(_path);
        });
    },

    /**
     * Move all the packages back from es6_modules to node_modules.
     * @param  {Array} packages - All the packages that need to be reversed.
     */
    movePackagesBack: function movePackagesBack(packages) {
        var _this6 = this;

        packages.forEach(function (_package) {
            var _currentPath = _path3['default'].join(_this6.paths.es6Modules, _package);
            var _newPath = _path3['default'].join(_this6.paths.nodeModules, _package);

            if (!_fsExtra2['default'].existsSync(_currentPath)) {
                return;
            }

            _fsExtra2['default'].renameSync(_currentPath, _newPath);
        });
    },

    /**
     * Remove the es6_modules directory to keep thing nice and clean.
     * @function
     */
    removeEsModulesDirectory: function removeEsModulesDirectory() {
        var _path = this.paths.es6Modules;

        if (!_fsExtra2['default'].existsSync(_path)) {
            return;
        }

        _fsExtra2['default'].removeSync(_path);
    }
};

exports['default'] = ModuleLoader;
module.exports = exports['default'];