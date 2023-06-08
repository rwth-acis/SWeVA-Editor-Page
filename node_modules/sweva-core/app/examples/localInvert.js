(function () {
    return {
        type: 'module',
        name: 'localInvert',
        compute: function (data, input, libs) {
            return -data;
        },
        dataInNames: ['data'],
        dataOutNames: ['result']
        
    }
})();