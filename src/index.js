import Fs from 'fs-extra';
import Path from 'path';

/**
 * Module Loader.
 * @namespace moduleloader
 */
let ModuleLoader = {
    /**
     * @var {Object} paths - The base paths.
     */
    paths:{
        base: Path.join(process.env.PWD),
        packageFile: Path.join(process.env.PWD,'package.json'),
        nodeModules: Path.join(process.env.PWD,'node_modules'),
        es6Modules: Path.join(process.env.PWD,'es6_modules')
    },
    
    /**
     * Perform some magic.
     * @function
     */
    execute(){
        // Get the package.json.
        this.packageFile = this.getPackage(this.paths.base, true);
        
        if(this.packageFile === false){
            return false;
        }
        
        this.mentionedInPackageFile = this.getAllFromPackageFile(this.packageFile);
        
        // Collect all the names of es6 packages.
        this.esPackages = this.getAllPackages(this.mentionedInPackageFile);
        
        // Only proceed when there is something to do.
        if(this.esPackages.length === 0){
            return;
        }
        
        // Move all the packages into es6_modules.
        this.movePackages(this.esPackages);
        
        // Create the redirect file.
        this.createRedirectForPackages(this.esPackages);
    },
    
    /**
     * Reverse our magic.
     * @function
     */
    reverse(){
        let _packages = this.getPackagesForReverse();
        
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
    getPackage(path, throwError = false){
        let file, json;
        
        path = Path.join(path, 'package.json');
        
        // Get the package.json file.
        try{
            file = Fs.readFileSync(path, 'utf-8');
        }catch(error){
            return false;
        }
        
        // Convert the package.json to an Object.
        try{
            json = JSON.parse(file);
        }catch(error){
            return false;
        }
        
        return json;
    },
    
    /**
     * Get all the packages that are es6.
     * @param  {Object} fromPackageFile - A list with all the packages mentioned in the projects package.json file (uses es6Dependencies)
     * @return {Array} All the packages that meet the requirements for an es6 package.
     */
    getAllPackages(fromPackageFile){
        let _modules = this.getAllNodeModules();
        
        // Check all the package files.
        let _paths = [];
        _modules = _modules.forEach((_module) => {
            let _result = this.checkModuleForEs(_module, fromPackageFile);
            if(_result){
                _paths.push(_result);
            }
        });
        
        return _paths;
    },
    
    /**
     * Get the names of all the node_modules directories.
     * @return {Array} All the node_modules names.
     */
    getAllNodeModules(){
        if(!Fs.existsSync(this.paths.nodeModules)){
            return [];
        }
        let _modules = Fs.readdirSync(this.paths.nodeModules);
        
        // Filter.
        _modules = _modules.filter((_module) => {
            return !_module.match(/^\..*/g);
        });
        return _modules;
    },
    
    /**
     * Check if the package is es6.
     * @param  {String} module - The name of the module.
     * @return {Boolean | Object} Object - the module/package name and the main path from the pacakge.json file.
     */
    checkModuleForEs(module){
        let _path = Path.join(this.paths.nodeModules, module);
        let _pkg = this.getPackage(_path);

        // Required.
        if(!_pkg){
            return false;
        }

        if(_pkg.es6Replaced){
            return false;
        }
        
        // Only one is requied.
        let _mainPath = false;

        if(_pkg.es6){
            if(_pkg.es6 !== true){
                _mainPath = _pkg.es6;
            }else{
                _mainPath = _pkg.main;
            }
        }
        
        if(this.mentionedInPackageFile[module]){
            if(this.mentionedInPackageFile[module] === true){
                if(_pkg.es6 !== true){
                    _mainPath = _pkg.es6;
                }else{
                    _mainPath = _pkg.main;
                }
            }else{
                _mainPath = this.mentionedInPackageFile[module];
            }
        }
        
        if(_mainPath === false){
            return false;
        }
        
        return {[module]:_mainPath};
    },
    
    /**
     * Move all the packages from node_modules to es6_modules.
     * @param  {Array} packages - All the package names.
     */
    movePackages(packages){
        if(!Fs.existsSync(this.paths.es6Modules)){
            Fs.mkdir(this.paths.es6Modules);
        }
        
        packages.forEach((_packageObject) => {
            let _package = Object.keys(_packageObject)[0];
            let _currentPath = Path.join(this.paths.nodeModules, _package);
            let _newPath = Path.join(this.paths.es6Modules, _package);
            
            if(!Fs.existsSync(_currentPath)){
                return false; // The module is already moved.
            }
            Fs.renameSync(_currentPath, _newPath);
        });
    },
    
    /**
     * Create a redirect from node_modules to es6_modules for all the es6 packages.
     * @param  {Array} packages - All the package names and main paths.
     */
    createRedirectForPackages(packages){
        packages.forEach((_packageObject) => {
            let _package = Object.keys(_packageObject)[0];
            let _mainPath = _packageObject[_package];
            let _oldPath = Path.join(this.paths.nodeModules, _package);
            let _currentPath = Path.join(this.paths.es6Modules, _package);
            
            // Generate a package.json and a index.js file.
            let _indexFile = this.generateIndexFile(_package, _mainPath);
            let _packageFile = this.generatePackageFile(_package);
            
            // Create the directory.
            Fs.mkdirSync(_oldPath);
            
            // Create the package.json file.
            Fs.writeFileSync(_oldPath + '/package.json', _packageFile);
            
            // Create the redirect index.js file.
            Fs.writeFileSync(_oldPath + '/index.js', _indexFile);
        });
    },
    
    /**
     * Generate the redirect index.js file.
     * @param  {String} module   - The name of the module.
     * @param  {String} mainPath - The path to the execute/main file.
     * @return {String} The redirect index.js contents.
     */
    generateIndexFile(pkg, mainPath){
        let _path = Path.join('../../', 'es6_modules', pkg, mainPath);
        let _file = "module.exports = require('"+_path+"');";
        return _file;
    },
    
    /**
     * Generate the package.json file.
     * @param  {String} pkg - The name of the module.
     * @return {String} The contents of the new package.json.
     */
    generatePackageFile(pkg){
        let _object = {
            name: pkg,
            main: 'index.js',
            es6Replaced: true,
        };
        return JSON.stringify(_object);
    },
    
    /**
     * Get all the modules from the project/main package.json file.
     * @param  {Object} pkg - A package.json file.
     * @return {Object} All the es6Dependencies.
     */
    getAllFromPackageFile(pkg){
        if(!(pkg && pkg.es6Dependencies)){
            return {}; // No packages found in the package.json file.
        }
        return pkg.es6Dependencies;
    },
    
    /**
     * Get all the packages that need to be reversed.
     * @return {Array} All the packages that need to be reversed.
     */
    getPackagesForReverse(){
        let _packages = this.getAllNodeModules();
        
        _packages = _packages.filter((_package) => {
            let _path = Path.join(this.paths.nodeModules, _package);
            let _pkg = this.getPackage(_path);
            
            if(!_pkg){
                return false;
            }
            
            if(_pkg.es6Replaced){
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
    removePackagesFromNodeModules(packages){
        packages.forEach((_package) => {
            let _path = Path.join(this.paths.nodeModules, _package);
            
            if(!Fs.existsSync(_path)){
                return;
            }
            
            Fs.removeSync(_path);
        });
    },
    
    /**
     * Move all the packages back from es6_modules to node_modules.
     * @param  {Array} packages - All the packages that need to be reversed.
     */
    movePackagesBack(packages){
        packages.forEach((_package) => {
            let _currentPath = Path.join(this.paths.es6Modules, _package);
            let _newPath = Path.join(this.paths.nodeModules, _package);

            if(!Fs.existsSync(_currentPath)){
                return;
            }
            
            Fs.renameSync(_currentPath, _newPath);
        });
    },
    
    /**
     * Remove the es6_modules directory to keep thing nice and clean.
     * @function
     */
    removeEsModulesDirectory(){
        let _path = this.paths.es6Modules;
        
        if(!Fs.existsSync(_path)){
            return;
        }
        
        Fs.removeSync(_path);
    }
};

export default ModuleLoader;
