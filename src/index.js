import Fs from 'fs';
import Path from 'path';

let ModuleLoader = {
    paths:{
        base: Path.join(__dirname, '../'),
        packageFile: Path.join(__dirname,'../','package.json'),
        nodeModules: Path.join(__dirname,'../','node_modules'),
        es6Modules: Path.join(__dirname,'../','es6_modules')
    },
    
    initialize(){
        this.packageFile = this.getPackage(this.paths.base, true);
        
        this.mentionedInPackageFile = this.getAllFromPackageFile(this.packageFile);
        
        // Collect all the names of es6 packages.
        this.esPackages = this.getAllPackages();
    },
    
    getAllPackages(){
        let _packages = this.getAllFromNodeModules();

        console.log('PACKAGES:', _packages);
        // Move all the packages into es6_modules.
        this.movePackages(_packages);
        
        // Create the redirect file.
        this.createRedirectForPackages(_packages);
    },
    
    createRedirectForPackages(packages){
        console.log(packages);
        packages.forEach((_packageObject) => {
            console.log(_packageObject);
            let _package = Object.keys(_packageObject)[0];
            let _mainPath = _packageObject[_package];
            let _oldPath = Path.join(this.paths.nodeModules, _package);
            let _currentPath = Path.join(this.paths.es6Modules, _package);
            
            let _indexFile = this.generateIndexFile(_currentPath, _mainPath);
            let _packageFile = this.generatePackageFile(_package);
            
            // Create the directory.
            Fs.mkdirSync(_oldPath);
            
            // Create the package.json file.
            Fs.writeFileSync(_oldPath + '/package.json', _packageFile);
            
            // Create the redirect file.
            console.log('index', _indexFile);
            Fs.writeFileSync(_oldPath + '/index.js', _indexFile);
        });
    },
    
    generateIndexFile(path, mainPath){
        let _path = Path.join(path, mainPath);
        let _file = "module.exports = require('"+_path+"');";//"import Module from '"+_path+"'; export default module;";
        return _file;
    },
    
    generatePackageFile(pkg){
        let _object = {
            name: pkg,
            main: 'index.js',
            es6Replaced: true,
        };
        return JSON.stringify(_object);
    },
    
    
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
        
        return true;
    },
    
    getAllFromPackageFile(pkg){
        if(!(pkg && pkg.es6Dependencies)){
            return {}; // No packages found in the package.json file.
        }
        return pkg.es6Dependencies;
    },
    
    getAllFromNodeModules(fromPackageFile){
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
            _mainPath = _pkg.es6;
        }
        
        if(this.mentionedInPackageFile[module]){
            _mainPath = this.mentionedInPackageFile[module];
        }
        
        if(_mainPath === false){
            return false;
        }
        
        return {[module]:_mainPath};
    },
    
    getPackage(path, throwError){
        let file, json;
        
        path = Path.join(path, 'package.json');
        
        // Get the package.json file.
        try{
            file = Fs.readFileSync(path, 'utf-8');
        }catch(error){
            if(throwError){
                throw new Error("es2015: We can't find the package.json file!");
            }
            return false;
        }
        
        // Convert the package.json to an Object.
        try{
            json = JSON.parse(file);
        }catch(error){
            if(throwError){
                throw new Error("es2015: Your package.json file is not valid json!");
            }
            return false;
        }
        
        return json;
    }
    
};


ModuleLoader.initialize();

export default ModuleLoader;
