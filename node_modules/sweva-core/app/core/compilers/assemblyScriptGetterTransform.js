//experimental transform instead of parsing the tsd file. This uses just internal AssemblyScript functions, that could change.
//might be an alternative, if it gets more stable in the future

const { Transform } = require("assemblyscript/cli/transform")

//const {CommonFlags} = require("assemblyscript/src/common");
//const {Signature} = require("assemblyscript");
//const {DecoratorFlags} = require("assemblyscript/src/program");
//const {Type} = require("assemblyscript/src/types");
//const assemblyscript = require("assemblyscript")
class AssemblyScriptGetterGenerator extends Transform {
    afterParse(parser) {
        var {CommonFlags, Signature, DecoratorFlags, Type, Visitor, VisitorContext} = window.require("assemblyscript");
        //console.log(parser);
        for (const source of parser.sources) {
            if(source.internalPath === 'module') {
                //console.log(source);
                source.statements;
            }
        }
    }

    afterInitialize(program) {
        /*var {CommonFlags, Signature, DecoratorFlags, Type} = window.require("assemblyscript");
        program.makeNativeFunction("aaa", new Signature(program, null, Type.i32), program.nativeFile, CommonFlags.EXPORT, DecoratorFlags.GLOBAL)
        console.log("ADDED:")
        console.log(program);*/
        //super.afterParse(parser);
    }
    afterCompile(module) {
        var {CommonFlags, Signature, DecoratorFlags, Type, Visitor, VisitorContext,TypeRef} = window.require("assemblyscript");
        console.log(module);
        console.log(this.program);
        let globalType = TypeRef.I32; //getGlobalType(module.getGlobal("testvar1"));
        let expr = module.global.get(module.getGlobalByIndex(1));
        module.addFunction('aaa', TypeRef.I32, globalType, null, expr);
    }
}
module.exports = AssemblyScriptGetterGenerator