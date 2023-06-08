(function () {
    return {
        type: 'composition',
        name: 'composition2',
        composables: {
            'composition1': 'composition1',
            'sub5': 'sub',
            'add5': 'add'
        },
        links: {
            'composition1': [
                {
                    to: 'add5',
                    mapping: 'sum1'
                }
            ],
            'sub5': [
                {
                    to: 'add5',
                    mapping: 'sum2'
                }
            ]
        },
        inputNames: ['offset', 'invert'],
        mapInput: function (input, moduleName, modules, libs) {
            return input;
        }
    }
})();