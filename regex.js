function preparse(regexp) {
    let stack = [],
        parsedRegexp = '',
        lastLeftBracket,
        lastRightParen,
        indexOfLeftParen;
        
    for(let [index, char] of Array.prototype.entries.call(regexp)) {
        switch(char) {
            case '(':
                stack.push(index);
                parsedRegexp += char;
                break;
            case ')':
                lastRightParen = index;
                indexOfLeftParen = stack.pop();
                let nextChar = regexp[index + 1],
                    stringToRepeat = regexp.slice(indexOfLeftParen , index + 1);
                    
                if(nextChar === '+') {
                    parsedRegexp += stringToRepeat + '|'+ stringToRepeat + '*';
                } else if(nextChar === '?') {
                    parsedRegexp += '()|' + stringToRepeat;
                } else {
                    parsedRegexp += char;
                }
                break;
            case '{':
                lastLeftBracket = index;
                parsedRegexp += char;
                break;
            case '}':
                let parseBracket = function(contentBetweenParen, range) {
                    range = range.slice(1,-1);
                    if(!range.includes(',')) {
                        let num = Number(range);
                        return '(' + contentBetweenParen.repeat(num) + ')';
                    } else {
                        let result = '',
                            rangeArr = [];
                        range = range.split(',');
                        for(let i = Number(range[0]); i <= Number(range[range.length - 1]); i ++) {
                            rangeArr.push(i);
                        }
                        rangeArr.forEach( function(num, index){
                            result += (index === 0 ? '' : '|') + contentBetweenParen.repeat(num)
                        });
                        return '(' + result + ')';
                    }
                };

                let range = regexp.slice(lastLeftBracket, index + 1);

                if(regexp[lastLeftBracket - 1] === ')') {
                    parsedRegexp = parsedRegexp.slice(0, indexOfLeftParen)
                                 + parseBracket(regexp.slice(indexOfLeftParen, lastRightParen + 1), range);
                } else {
                    parsedRegexp = parsedRegexp.slice(0, lastLeftBracket - 1)
                                 + parseBracket(regexp[lastLeftBracket - 1], range);
                }
                break;
            case '+':
                if(regexp[index - 1] !== ')') {
                    parsedRegexp += regexp[index - 1] + '*';
                }
                break;
            case '?':
                if(regexp[index - 1] !== ')') {
                    parsedRegexp = parsedRegexp.slice(0, -1) + '(()|' + regexp[index - 1] + ')';  
                }
                break;
                
            default:
                parsedRegexp += char;
        }
    }

    return parsedRegexp;
}

function generateNFA(regexp) {

    let graph = new Map(),
        metaChar = new Set(['|', '(', ')', '*']);


    Array.prototype.forEach.call(regexp, (char, index) => {
        graph.set(index, []);
    });

    graph.set(graph.size, []); // 添加一个最终状态作为顶点

    graph.addEdge = function(v, w) {
        if(!this.has(v)) throw Error('不存在顶点' + v);
        this.get(v).push(w);
    };

    // 实际上，我们并不会在graph中记录代表“匹配转换”的边
    let stackOfOperatorsIndex = [],
        indexOfLeftParen;
    for(let [index, char] of Array.prototype.entries.call(regexp)) {
        switch (char) {
            case '(':
                graph.addEdge(index, index + 1);
            case '|':
                stackOfOperatorsIndex.push(index);
                break;
            case ')':
                // 发现了左括号说明栈里此时已有零个、一个或多个|
                let indexOfOrOperator = stackOfOperatorsIndex.pop();
                let orOpeartors = [];
                if(regexp[indexOfOrOperator] === '|') {
                    orOpeartors.push(indexOfOrOperator);
                    while(true) {
                        indexOfOrOperator = stackOfOperatorsIndex.pop();
                        if(regexp[indexOfOrOperator] !== '|') { // 此时肯定是左括号
                            indexOfLeftParen = indexOfOrOperator;
                            break;
                        } else {
                            orOpeartors.push(indexOfOrOperator);
                        }
                    }

                    for(let or of orOpeartors) {
                        graph.addEdge(indexOfLeftParen, or + 1);
                        graph.addEdge(or, index);
                    }

                } else {
                    indexOfLeftParen = indexOfOrOperator;
                }

                graph.addEdge(index, index + 1);
                break;
            case '*':
                if(regexp[index - 1] === ')') {
                    graph.addEdge(index, indexOfLeftParen);
                    graph.addEdge(indexOfLeftParen, index);
                } else {
                    graph.addEdge(index, index - 1);
                    graph.addEdge(index - 1, index);
                }
                graph.addEdge(index, index + 1);
                break;
            // 进入“连接操作”的处理
            default:
                break;
        }

    }
    graph.addEdge(0, 1);
    graph.addEdge(graph.size - 2, graph.size - 1);

    return graph;
}

function testWithNFA(text, regexp) {
    regexp = preparse('(' + regexp + ')');
    let NFAGraph = generateNFA(regexp),
        lengthOfPattern = NFAGraph.size;

    function isReachable(start, end) {
        let visitedVertexes = new Set(),
            flag = false;

        function dfsProcess(vertex) {
            if(vertex === end) {
                flag = true;
                return;
            };
            visitedVertexes.add(vertex);
            for(let v of NFAGraph.get(vertex)) {
                if(!visitedVertexes.has(v)) dfsProcess(v);
            }
        }

        dfsProcess(start);
        return flag;
    }

    let pc = [];
    for(let vertex of NFAGraph.keys()) {
        if(isReachable(0, vertex)) pc.push(vertex);
    }

    for(let char of text) {
        let match = pc.filter(vertex => regexp[vertex] === char || regexp[vertex] === '.').map(v => v + 1);
        for(let vertex of match) {
            for(let i = 0; i < lengthOfPattern; i ++) {
                if(isReachable(vertex, i)) pc.push(i);
            }
        }
    }

    return pc.indexOf(lengthOfPattern - 1) > -1;

}