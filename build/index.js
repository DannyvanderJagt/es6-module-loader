'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path2 = require('path');

var _path3 = _interopRequireDefault(_path2);

var ModuleLoader = {
    paths: {
        base: _path3['default'].join(__dirname, '../'),
        packageFile: _path3['default'].join(__dirname, '../', 'package.json'),
        nodeModules: _path3['default'].join(__dirname, '../', 'node_modules'),
        es6Modules: _path3['default'].join(__dirname, '../', 'es6_modules')
    },

    initialize: function initialize() {
        this.packageFile = this.getPackage(this.paths.base, true);

        this.mentionedInPackageFile = this.getAllFromPackageFile(this.packageFile);

        // Collect all the names of es6 packages.
        this.esPackages = this.getAllPackages();
    },

    getAllPackages: function getAllPackages() {
        var _packages = this.getAllFromNodeModules();

        console.log('PACKAGES:', _packages);
        // Move all the packages into es6_modules.
        this.movePackages(_packages);

        // Create the redirect file.
        this.createRedirectForPackages(_packages);
    },

    createRedirectForPackages: function createRedirectForPackages(packages) {
        var _this = this;

        console.log(packages);
        packages.forEach(function (_packageObject) {
            console.log(_packageObject);
            var _package = Object.keys(_packageObject)[0];
            var _mainPath = _packageObject[_package];
            var _oldPath = _path3['default'].join(_this.paths.nodeModules, _package);
            var _currentPath = _path3['default'].join(_this.paths.es6Modules, _package);

            var _indexFile = _this.generateIndexFile(_currentPath, _mainPath);
            var _packageFile = _this.generatePackageFile(_package);

            // Create the directory.
            _fs2['default'].mkdirSync(_oldPath);

            // Create the package.json file.
            _fs2['default'].writeFileSync(_oldPath + '/package.json', _packageFile);

            // Create the redirect file.
            console.log('index', _indexFile);
            _fs2['default'].writeFileSync(_oldPath + '/index.js', _indexFile);
        });
    },

    generateIndexFile: function generateIndexFile(path, mainPath) {
        var _path = _path3['default'].join(path, mainPath);
        var _file = "module.exports = require('" + _path + "');"; //"import Module from '"+_path+"'; export default module;";
        return _file;
    },

    generatePackageFile: function generatePackageFile(pkg) {
        var _object = {
            name: pkg,
            main: 'index.js',
            es6Replaced: true
        };
        return JSON.stringify(_object);
    },

    movePackages: function movePackages(packages) {
        var _this2 = this;

        if (!_fs2['default'].existsSync(this.paths.es6Modules)) {
            _fs2['default'].mkdir(this.paths.es6Modules);
        }

        packages.forEach(function (_packageObject) {
            var _package = Object.keys(_packageObject)[0];
            var _currentPath = _path3['default'].join(_this2.paths.nodeModules, _package);
            var _newPath = _path3['default'].join(_this2.paths.es6Modules, _package);

            if (!_fs2['default'].existsSync(_currentPath)) {
                return false; // The module is already moved.
            }
            _fs2['default'].renameSync(_currentPath, _newPath);
        });

        return true;
    },

    getAllFromPackageFile: function getAllFromPackageFile(pkg) {
        if (!(pkg && pkg.es6Dependencies)) {
            return {}; // No packages found in the package.json file.
        }
        return pkg.es6Dependencies;
    },

    getAllFromNodeModules: function getAllFromNodeModules(fromPackageFile) {
        var _this3 = this;

        var _modules = this.getAllNodeModules();

        // Check all the package files.
        var _paths = [];
        _modules = _modules.forEach(function (_module) {
            var _result = _this3.checkModuleForEs(_module, fromPackageFile);
            if (_result) {
                _paths.push(_result);
            }
        });

        return _paths;
    },

    getAllNodeModules: function getAllNodeModules() {
        if (!_fs2['default'].existsSync(this.paths.nodeModules)) {
            return [];
        }
        var _modules = _fs2['default'].readdirSync(this.paths.nodeModules);

        // Filter.
        _modules = _modules.filter(function (_module) {
            return !_module.match(/^\..*/g);
        });
        return _modules;
    },

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

    getPackage: function getPackage(path, throwError) {
        var file = undefined,
            json = undefined;

        path = _path3['default'].join(path, 'package.json');

        // Get the package.json file.
        try {
            file = _fs2['default'].readFileSync(path, 'utf-8');
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
    }

};

ModuleLoader.initialize();

exports['default'] = ModuleLoader;
module.exports = exports['default'];