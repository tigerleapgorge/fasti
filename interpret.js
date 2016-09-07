// FASTI: Force-directed Abstract Syntax Tree Interpreter 
// Copyright (C) 2016 Charles Li


/*******         Global Data                        ******/
    var curNodeStack = []; // for visualization

/*******                Parser                      ******/
    var categorize = function(curToken){
        if ( !isNaN(curToken) ) {
            return { type : "number" , value : parseFloat(curToken) };
        } else {
            return { type : "identifier", value : curToken };
        }
    };
    
    var parenthesize = function(tokenList) {
        var retArray = [];
        while( tokenList.length ) {
            var curToken = tokenList.shift();
            if(curToken === "(") { 
                retArray.push( { type : "expr" , value : "()", sexpr : parenthesize(tokenList) } ); // recursive
            } else if(curToken === ")") {
                return retArray;
            } else {
                retArray.push( categorize(curToken) );
                console.log("parenthesize ", retArray);
            }
        }
        return retArray;
    };

/*******                Library                      ******/
    var library = {
        "+" : function*(x, y) {
                var sum = 0;
                for(var i = 0; i < arguments.length; i++) {
                    sum += arguments[i];
                }
                return sum;
        },
        "-" : function*(x, y) {
            return (x - y);
        },
        "*" : function*(x, y) {
            return (x * y);
        },
        "/" : function*(x, y) {
            return (x / y);
        },
        "<" : function*(x, y) {
            return (x < y);
        },
    };
    
    var Context = function(scope, parent) {
        this.scope = scope;
        this.parent = parent;
        /*
        this.get = function(identifier){
          if (identifier in this.scope) {
              return this.scope[identifier];
          } else if (this.parent !== undefined) {
              return this.parent.get(identifier); // recursive to the top.
          }
        };
        */
        this.get = function(identifier) {
            var curEnv = this;
            while(curEnv !== undefined) {
                var curScope = curEnv.scope;
                if (identifier in curScope) {
                    return curScope[identifier];
                }
                curEnv = curEnv.parent;
            }
        };
    };

    var ContextList = []; // array of Context for visualization


    var copyList = function(input) { // accepts array, returns array
        
        console.log("copyList in:  ", input);
        var inputCopy = [];
        for(var i = 0; i < input.length; i++){
            
            //inputCopy[i] = Object.assign({}, input[i]);
            inputCopy[i] = JSON.parse(JSON.stringify(input[i]));
            //inputCopy[i] = $.extend(true, {}, input[i]);

            delete inputCopy[i].a;
            delete inputCopy[i].v;
            delete inputCopy[i].pos;
            console.log("Copying object: ", input[i], "to", inputCopy[i]);


            if(input[i].sexpr !== undefined) {
                inputCopy[i]["sexpr"] = copyList(input[i].sexpr); 
            }
        }
        console.log("copyList out: ", input);
        return inputCopy;
    };


/*******                Interpreter                      ******/
    var interpretList = function*(input, context) {
        if (input[0].value === "if") { // special forms
            input[1].result = yield* interpret( input[1], context );
            if ( input[1].result ) { // Recurse
                input[2].result = yield* interpret( input[2], context ); // Recurse consequence
                return input[2].result;
            } else {
                input[3].result = yield* interpret( input[3], context ); // Recurse alternative
                return input[3].result;
            }
        } else if (input[0].value === "define") {
            context.scope[input[1].value] = yield* interpret(input[2], context);
            console.log("defining:", context)
            return;
        } else if (input[0].value === "lambda") { // Create a Lambda
            return {
                type   : "lambda",
                formal : input[1].sexpr,
                body   : input[2],
            };
        } else { // non-special form - applicative order evaluation

            var list  = [];
            for(var i = 0 ; i < input.length; i++) {
                list[i] = yield* interpret(input[i], context);
            }

            if (list[0] instanceof Function) {               // JS function
                var proc = list.shift();                         // first element of the array
                var args = list;                                 // rest of the element
                return yield* proc.apply(undefined, args);

            } else if ( list[0] instanceof Object &&         // LISP lambda
                        list[0].type === "lambda") {
                var lambdaObj = list.shift();                    // Remove first element from array and return that element
                var actualArg = list;

                var formalArg = lambdaObj.formal;
                var funcBody  = lambdaObj.body;  // duplicate this

                var copySexpr = copyList(lambdaObj.body.sexpr);
                //input[0]["sexpr"] = copySexpr;
                input[input.length] = { type: "expr", sexpr: copySexpr }; 
                //input[input.length]["sexpr"] = copySexpr;

                var localEnv = {};                               // construct lambda env
                for(var i = 0; i < actualArg.length; i++) {
                    localEnv[formalArg[i].value] = actualArg[i]; // bind 
                }

                var localContext = new Context(localEnv, context); // chain it with previous Env
                ContextList.push( localContext );                  // push: for visualization
                //var lambdaResult = yield* interpretList(funcBody.sexpr, localContext); // Recurse
                var lambdaResult = yield* interpretList(copySexpr, localContext); // Recurse
                ContextList.pop();                                 // pop:  must match push
                return lambdaResult;
                
            } else {
                return list;
            }
        }
    };

    var interpret = function* (input, context) {
        curNodeStack.push( input );  // for visualizing current program stack
        if (input.type === "expr") {              // Expression
            input.result = yield* interpretList(input.sexpr, context); // Recurse on sub Expression            
        } else if (input.type === "identifier") { // Variable
            input.result = context.get(input.value);
        } else if (input.type === "number") {     // Literal
            input.result = input.value;
        } else {
            console.error("Warning: interpret do not recognize atom type: ", input.type);
        }
        yield;
        curNodeStack.pop();           // must match push
        return input.result;
    };
