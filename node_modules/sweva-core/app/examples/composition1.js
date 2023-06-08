(function () {
    return {
        type: 'composition',
        name: 'composition1',
        composables: {
            'adder1': 'localAdd',
            'adder2': 'add',
            'adder3': 'add',
            'subber1': 'sub',
            'subber2': 'sub',
            'clone1': 'clone',
            'invert1': 'localInvert'
        },
        links: {
            'adder1': [
                {
                    to: 'subber1',
                    mapping: 'sub1'
                }
            ],
            'clone1': [
                {
                    to: 'subber1',
                    mapping: {
                        'second': 'sub2'
                    }
                },
                {
                    to: 'subber2',
                    mapping: {
                        'first': 'sub1'
                    }
                }
            ],
            'adder2': [
                {
                    to: 'subber2',
                    mapping: 'sub2'
                }
            ],
            'subber1': [
                {
                    to: 'adder3',
                    mapping: 'sum1'
                }
            ],
            'subber2': [
                {
                    to: 'adder3',
                    mapping: 'sum2'
                }
            ],
            'adder3': [
               {
                   to: 'invert1'
               }
            ]
        },
        inputNames: ['offset', 'invert'],
        mapInput: function (input, moduleName, modules, libs) {
            return input;
        }
    }
})();