(function () {
    return {
        type: 'module',
        name: 'sub',
        request: function (data, input, libs) {
            var request = libs.axios.get('http://localhost:8080/example/calc/sub/'
                + data.sub1 + '/' + data.sub2,
                {
                    params: {
                        modifier1: input.offset,
                        modifier2: input.invert
                    }
                });
            return request;
        },
        dataInNames: ['sub1', 'sub2'],
        dataInSchema: {
            type: 'object',
            properties: {
                sub1: {
                    type: 'number'
                },
                sub2: {
                    type: 'number'
                }
            },
            required: ['sub1', 'sub2']
        },
        dataOutNames: ['result'],
        dataOutSchema: {
            type: 'number'
        },
        inputNames: ['offset', 'invert']
    }
})();