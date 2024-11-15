/*

The _head_ represents the library and its accessibles. In the browner this manifests as the
first object to loadout; "Glucose"

The head contains a range of hoisting functions to late-load installables.

1. add this file
2. Load assets with Glucose.head.install() ...

    class A {

        foo() {
            return 'foo'
        }
    }


    class B extends A {

        bar() {
            return 'bar'
        }
    }


    class C extends B {

        baz() {
            return 'baz'
        }
    }

    Glucose.head.install(A)
    Glucose.head.install(B)
    Glucose.head.install(C)

    Glucose.head.mixin('C', {
        one: {
            get() {
                return 'one'
            }
        }
    })

    c = new C;
    c.one == 'one'
    c.two == undefined

    Glucose.head.mixin('B', {
        two: {
            get() {
                return 'two'
            }
        }
    })

    b = new B;
    b.two == 'two'
    c.two == 'two'

    Glucose.head.mixin('A', {
        three: {
            get() {
                return 'three'
            }
        }
    })

    (new A).three == 'three'
    b.three == 'three'
    c.three == 'three'

*/
;(function(parent, name=undefined, debug=false, strict=true){

    const dlog = debug?console.log.bind(console): ()=>{}
    const waiting = {}
    const currentScr = document.currentScript
    const currentLoc = document.currentScript.src

    /* Options to configure the lib. Append with `lib.cofigure(d)` */
    const exposedConfig = { debug, strict, waiting, dlog }

    /*
    Test the parent during entry for the exposed `name`. This asset parking
    on the expected name. In this current form its used as a early config for
    library config.

    However this can also serve as a protection from accidental deletion.
    */
    let parkedEntity = undefined;

    const resolveName = function(n){
        /* Return the name, by order:

            Attribute `name`
            Dataset `name`
            hash value `#name`
            ~filename   `name.js`~
            Glucose (default-name)
        */
        if(n === undefined) {
            /* Grab the `name` from the script, then the `data-name` */
            n = currentScr.dataset.name
            const attr = currentScr.attributes.name
            if(attr) {
                n = attr.value
            };
        }

        if(n === undefined) {
            // Check for the HASH name,
            let src = currentScr.src;
            let u = new URL(src).hash.slice(1)
            if(u.length > 0) {
                n = u;
            }

            /* default to the filename.*/
            // src.split('/').pop()
        }

        if(n === undefined) {
            n = 'Glucose'
        }

        return n;
    }

    name = resolveName(name)

    if(parent[name] !== undefined) {
        console.log('Parked asset on', name)
        parkedEntity = parent[name]
    }

    /*
    The Glucose.file object, to assign meta data to the concurrent file.
    Note this is exposed on the primary object, and not the 'head'
     */
    const fileObject = {
        meta(data) {
            /* Incoming mets data for the incoming file.*/
            console.log('meta config', data)
            if(data.files) {
                let src = document.currentScript
                console.log(src)
            }
        }
    }

    /* Install properties onto an incoming unit


        Glucose.mixin('Point', {

            _draggable: {
                value: true,
                writable: true
            }

            , draggable: {
                get() {
                    return this._draggable
                }
            }
        })

        this.center.draggable == true
        this.center._draggable = false
        this.center.draggable == false
     */
    const mixin = function(target, addon, targetPrototype=true) {
        const targetName = target.getMixinTarget? target.getMixinTarget(): target

        if(exposed[targetName]) {

            dlog(`Installing mixin for "${targetName}"`)
            populateAddon(targetName, addon, targetPrototype)
            return
        }

        dlog('Mixin Waiting for unit', targetName)
        if(waiting[targetName] == undefined) {
            waiting[targetName] = []

        }

        waiting[targetName].push(addon)
    }

    /* Install static methods:

        Glucose.static('Point', {
            mouse: {
                value: autoMouse
                // , writable: true
                // , enumerable: false
                // , configurable: true
            }
        })

        Point.mouse == autoMouse
        (new Point).mouse == undefined

    */
    const staticMixin = function(target, addon) {
        return mixin(target, addon, false)
    }

    const installMap = new Map;

    /* "Install" an entity, allowing the automated mixin population
    And Glucose calling.

    Note, this isn't required - but without it, the autoloading mechanism
    won't function

        Glucose.install(Point)
        Glucose.installed
        { "Point" }

    When applied, we can use mixins:

        Glucose.mixin('Point', {
            foo: { value: 1000 }
        })

    This can work in any order; late or early.
    */
    const install = function(entity, name=undefined) {
        if(name == undefined) {
            /* Expecting a _thing_ with a name, such as a class; Point */
            name = entity.name
        }

        dlog(`Installing entity "${name}"`)
        exposed[name] = entity;

        if(waiting[name] != undefined) {
            // loop install
            populateAddons(name, waiting[name])
        }

        /*Install to a map so we can infer later.
            Glucose.installed
            [...]
        */
        installMap.set(name, entity)
    }

    const installMany = function() {
        /* Receive many items to install
            installMany(A, B, C)
        */
       Array.from(arguments).forEach(C => install(C))
    }

    const populateAddons = function(name, items, targetPrototype=true) {
        dlog('Installing addons', items.length, 'to', name)
        for (var i = 0; i < items.length; i++) {
            populateAddon(name, items[i], targetPrototype)
        }
    }

    const populateAddon = function(name, item, targetPrototype=true) {
        dlog('populateAddon', name, item)
        let Klass = exposed[name]

        let proto = targetPrototype? Klass.prototype.constructor.prototype: Klass

        // let proto = Object.getPrototypeOf(head[name])

        let r = {}
        // proto[name] = item
        let names = Object.getOwnPropertyNames(item);
        for(let name of names) {
            // define(proto, name, { value: item, writable: false})
            try {
                Object.defineProperties(proto, item)
                r[name] = true
            } catch(e) {
                r[name] = false
            }
        }
        return r
    }

    const define = function(proto, name, def) {
        Object.defineProperty(proto, name, def)
        // Object.defineProperties(proto, name )
    }

    /*
        Assume many functions to install:

            Glucose.installFunctions('Point', {
                track(other, settings) {
                    return constraints.distance(other, this, settings)
                }

                , leash(other, settings) {
                    return constraints.within(other, this, settings)
                }
            });

        synonymous to:

        Glucose.mixin('Point', {
            track: {
                value(any=false) {
                    /// ...
                }
                , writable: true
            }
            , leash: { ... }
        })

     */
    const installFunctions = function(name, functionsDict) {
        let def = {}
        for(let k in functionsDict) {
            let func = functionsDict[k]
            def[k] = {
                value: func
                , writable: true
            }
        }

        return mixin(name, def)
    }


    /*
        Assume many correctly named functions to access values on first call.

        e.g from:

            Glucose.mixin('Point', {
                pen: {
                    get() {
                        let r = this._pen
                        if(r == undefined) {
                            r = new PointPen(this)
                            this._pen = r
                        }
                        return r
                    }
                }
            })

        to:

            Glucose.lazyProp('Point', {
                pen() {
                    let r = this._pen
                    if(r == undefined) {
                        r = new PointPen(this)
                        this._pen = r
                    }
                    return r
                }
            })

            stage.center._pen == undefined
            stage.center.pen == Pen
            stage.center._pen == Pen
     */
    const lazyProp = function(name, propsDict) {
        console.log('lazyProp', name, Object.keys(propsDict))
        let def = {
        }

        for(let key in propsDict) {

            let propName = key
            let val = propsDict[key]

            def[propName] = { get: val }
        }

        return mixin(name, def)
    }


    /*
        Note: This is a singleton.

            Glucose.lazierProp(name,
                function screenshot() {
                    return new Screenshot(this)
                }
            );


        Synonymous to:

            const scope = Glucose
            Glucose.lazyProp('Stage', {
                screenshot() {
                    let s = scope._screenshot;
                    if(s) { return s };
                    scope._screenshot = new Screenshot(this)
                    return scope._screenshot
                }
            })

     */
    const lazierProp = function(name, method, reference) {
        let methodName = reference==undefined? method.name: reference

        let target = exposed;
        lazyProp(name, {
            [methodName]() {
                let innerName = `_${methodName}`
                let s = exposed[innerName];
                if(s) { return s };
                return exposed[innerName] = method.bind(this)()
                // return this[innerName]
            }
        })
    }

    /* Apply a lazy getter property to a target to return an instance of a thing.
    The instance of the thing, is created _once_ on-demand, on the target.
    Future calls return the first created object.

        Glucose.head.deferredProp('Point', function screenshot() {
                return new Screenshot(this)
            }
        })
    */
    const deferredProp = function(name, method, reference) {
        let methodName = reference==undefined? method.name: reference

        return lazyProp(name, {
            [methodName]() {
                let innerName = `_${methodName}`
                let s = this[innerName];
                if(s) { return s };
                return this[innerName] = method.bind(this)()
                // return this[innerName]
            }
        })
    }

    const load = function(name, callback){
        /* A shortcut for loading a stub*/
        return ljs.load(name, function() {
            console.log('Loaded', name, arguments);
            return callback && callback()
        })
    }

    /* Load data into the 'head', allowing for a _preconfigure_ before the
    main loading sequences.

    Note this function is configured to run once, and does not account for
    repeat calls, and does not deep-merge the data dictionary with the
    existing configuration */
    const configure = function(data) {
        let r = Object.assign(exposedConfig, data)
        let files = data.files
        if(files) {
            if(typeof(files) == 'function') {
                /* a function expects the srcPath*/
                let srcPath = r.srcPath;

                if(srcPath == undefined) {
                    console.warn('No "srcPath" given, assuming no path: ""')
                    srcPath = ''
                }
                assets = files(srcPath)
                ljs.addAliases(assets)
            }
        }

        if(data.load) {
            // a load is requested
            load(data.load, data.onLoad)
        }

        return r
    }

    const head = {
        add: function(func, scope) {
            let obj = exposed[scope]

            if(obj == undefined) {
                obj = exposed[scope] = {}
            }
            obj[func.name] = func
        }
        , config: exposedConfig
        , configure
        , load
        , static: staticMixin
        , mixin, install, installMany
        , installFunctions
        , define
        , lazyProp, lazierProp, deferredProp
        /* Return a map iterator of the installed items.*/
        , get installed() {
            return installMap.keys()
        }
    }

    const depSet = new Set;
    const printOnce = function(methodName) {
        if(depSet.has(methodName)){
            return
        }
        let old = `${name}.${methodName}`
        let _new = `${name}.head.${methodName}`
        depSet.add(methodName)
        console.warn(`Deprecated: "${old}()", Use "${_new}()"`)
    }

    /* Push a warning log upon access of the function.
    The log is printed once. */
    const deprecate = function(innerFunc, name) {
        const methodName = name || innerFunc.name;
        let f = function(){
            printOnce(methodName)
            exposed[methodName] = innerFunc
            return innerFunc.apply(exposed, arguments)
        }

        f.name = methodName
        return f
    }

    const exposed = {
        ready: false
        , head
        , file: fileObject
    }

    if(!strict){
        /* When not in strict mode, the exposed functions are applied to the
        root*/
        Object.assign(exposed, {
            mixin: deprecate(mixin)
           , static: staticMixin
            , install: deprecate(install)
            , installFunctions: deprecate(installFunctions)
            , define: deprecate(define)
            , lazyProp: deprecate(lazyProp)
            , lazierProp: deprecate(lazierProp)
        })
    }

    class Stub {
        /* The stub applies a reference to a non-existence [future] class.
        Allowing the extension of future classes when they appear.
        */
        constructor(prop, history=[]) {
            this.assignedName = prop
            this.history = history

            const proxy = new Proxy(this, {
                get(target, property, receiver) {
                    if(Reflect.has(target, property)){
                        return Reflect.get(target, property, receiver)
                    }
                    return target.getUndefined(target, property, receiver)
                },
            });
            return proxy;
        }

        getMixinTarget() {
            /* This unit was given in place of a mixin definition.
            Return the _name_ of the target*/
            return this.assignedName
        }

        getUndefined(target, property, receiver) {
            console.log('get unknown', property, 'on stub')
            this.history.push(this.assignedName)
            return new this.constructor(property, this.history)
        }

        get(v) {
            console.log(v)
        }

        get [Symbol.toStringTag]() {
            return this.toString()
        }

        [Symbol.toPrimitive](hint) {
            if (hint === 'string') {
                return this.toString()
            }
            return Reflect.apply(...arguments)
        }

        toString(){
            return this.assignedName;
        }
    }


    const exposedProxyHandler = {
        get(target, prop, receiver) {
            /* Upon _get_ of a property within the exposed object,
            we first test to ensure the target value exists,

            If not, return a stub allowing capture and import.
            Else the stub can be reactive to usage.

            If true, return the prop object.
            */
            if(!Reflect.has(target, prop)) {
                return this.getUnknown(target, prop, receiver)
            }

            // console.log('Exposed Get', prop)
            return Reflect.get(target, prop, receiver)
        }

        , getUnknown(target, prop, receiver) {
            /* A request to  a property of which does not exist (yet).
            Return a stub in place of the requested future import.
            */
            // console.warn('Unknown prop response', prop)
            return new Stub(prop)
        }
    }

    const exposureProxy = new Proxy(exposed, exposedProxyHandler)

    parent[name] = exposureProxy;

}).apply({}, [this, undefined, true]);