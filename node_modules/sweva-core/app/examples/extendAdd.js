(function () {
    return {
        type: 'module',
        name: 'extendAdd',
        extends: 'add',        
        response: function (response, input, libs) {
            var result = +response.data;
            return -result;
        }
    }
})();