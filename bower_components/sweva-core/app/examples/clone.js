(function () {
    return {
        type: 'module',
        name: 'clone',
        request: function (data, input, libs) {
            var request = libs.axios.get('http://localhost:8080/example/calc/add/'
                + data.sum1 + '/' + data.sum2);
            return request;
        },
        response: function (response, input, libs) {
            return {
                first: response.data,
                second: response.data
            };
        },
        dataInNames: ['sum1', 'sum2'],
        dataInSchema: {
            type: 'object',
            properties: {
                sum1: {
                    type: 'number'
                },
                sum2: {
                    type: 'number'
                }
            },
            required: ['sum1', 'sum2']
        },
        dataOutNames: ['first', 'second'],
        dataOutSchema: {
            type: 'object',
            properties: {
                first: {
                    type: 'number'
                },
                second: {
                    type: 'number'
                }
            },
            required: ['first', 'second']
        },
        inputNames: []
    }
})();