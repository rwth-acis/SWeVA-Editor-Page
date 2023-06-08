/**
 * Creates instance of support library
 *
 * Allow loading functionality separately, depending on what is needed for a specific runner
 *
 * @constructor
 */

function SupportLibrary() {
    this.functions = {};
}

SupportLibrary.prototype.loadTestSync = function() {
    this.functions.test = {
        async: false,
        languageSpecific: {
            typescript: {
                parameterSig: "url: string",
                returnSig: "string"
            }
        },
        func: function (url) {
            return url + url;
        }
    };
}

SupportLibrary.prototype.loadLogger = function() {
    this.functions.log = {
        description: "Log the text to the browser console",
        async: false,
        languageSpecific: {
            typescript: {
                parameterSig: "text: string",
                returnSig: "void"
            }},
        func: function (text) {
            console.log(text);
        }};
}
SupportLibrary.prototype.loadHTTP = function() {
    this.functions.httpRequest = {
        description: "Send a HTTP(S) request using the fetch api. Returns status=-1 on timeout!",
        async: true,
        languageSpecific:{
            typescript: {
                parameterSig: "url: string, headers:string = null | null, method:string = 'GET' | null, body:string = null | null, cache:string = 'no-store' | null, timeout:i32 = 5000",
                returnSig: "text: string, status: int"
        }},
        func: async function (url, headers, method, body, cache, timeout) {
            let init = {};

            if(headers != null)
                init.headers = headers;
            if(method != null)
                init.method = method;
            if(body != null)
                init.body = body;
            if(cache != null)
                init.cache = cache;
            else
                init.cache = "no-store";

            let controller = new AbortController();
            let timeoutTimer = setTimeout(() => controller.abort(), timeout);
            init.signal = controller.signal;

            try{
                let response = await fetch(url, init);
                clearTimeout(timeoutTimer);
                console.log("RESPONSE:")
                console.log(response);
                let text = await response.text();
                return [text, response.status];
            } catch (e) {
                return ["TIMEOUT", -1];
            }
        }};
}

module.exports = SupportLibrary;