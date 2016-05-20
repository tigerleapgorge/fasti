// Force directed Abstract Syntax Tree Interpreter Copyright Charles Li

(function () {
    "use strict";
    var canvas = document.getElementById("myCanvas");
    var ctx = canvas.getContext("2d");
/*******                Data                     ******/
    var sourceCode = "( ( lambda ( a b ) (+ a b) ) 8 55 )";
    //var sourceCode = "( ( lambda (x) x) 3)";
    //var sourceCode = "(+ 3 5)";
    var tokenArray = [];
    var ast = [];

/*******                Vector                      ******/
    function Vector(x, y) {
        if ( !(this instanceof Vector) ) { // dont need new
           var new_vec = new Vector(x, y);
           return new_vec;
        }
        this.x = x || 0;
        this.y = y || 0;
    };

	Vector.prototype.add = function(vecArg) {
        return new Vector(this.x + vecArg.x, this.y + vecArg.y);
	};

    var deltaRightVector = new Vector(50,0);
    var deltaDownVector = new Vector(0,50);

/*******                Graphics                      ******/
    function drawText(myStr, posVector){
        ctx.font = "25px Arial";
        ctx.fillStyle = "#0095DD";
        ctx.fillText(myStr, posVector.x-10, posVector.y+7);
    }

    function drawAll(){ // draw loop
        ctx.clearRect(0, 0, canvas.width, canvas.height); // clear screen
        drawText(sourceCode, Vector(20,20) ); // TODO: change hard coded
        drawText(tokenArray, Vector(20,50) ); // TODO: change hard coded
        drawText(ast, Vector(20,80) );

		requestAnimationFrame(drawAll); // loop
    }
    
/*******                Parser                      ******/
    var categorize = function(curToken){
        if ( !isNaN(curToken) ) {
            return { type : "number" , value : parseFloat(curToken) };
        } else {
            return { type : "identifier", value : curToken };
        }
    }
    
    var parenthesize = function(tokenList) {
        var retArray = [];
        while( tokenList.length ) {
            var curToken = tokenList.shift();
            if(curToken === "("){ 
                retArray.push( { type : "expr" , value : parenthesize(tokenList) } ); // recursive
            } else if(curToken === ")") {
                return retArray;
            } else {
                retArray.push( categorize(curToken) );
            }
        }
        return retArray;
    }

/*******                Library                      ******/
    var library = {
        "+" : function(x, y) {
            //  return x + y;
                var sum = 0;
                for(var i = 0; i < arguments.length; i++) {
                    sum += arguments[i];
                }
                return sum;
              }
    }
    
    var Context = function(scope, parent) {
        this.scope = scope;
        this.parent = parent;
        
        this.get = function(identifier){
          if (identifier in this.scope) {
              return this.scope[identifier];
          } else if (this.parent !== undefined) {
              return this.parent.get(identifier); // recursive to the top.
          }
        };
    }

    var special = {
        if : function(input, context) {
                console.log("If: input[1]", input[1] );
            if ( interpret( input[1], context ) ) {
                console.log("True: input[2]", input[2] );
                return interpret( input[2], context );
            } else {
                console.log("False: input[3]", input[3] );
                return interpret( input[3], context );
            }
        } , 
        lambda : function(input, context) {
            return function() {
                console.log("lambda arguments: ", arguments);
                var lambdaArguments = arguments;
                // .value is added to get around the array encapsulation
                // TODO: change to foreach and ABSTRACT to a seperate function
                //       place new function near interpretList to make Expr
                //       processing easier
                var lambdaScope = input[1].value.reduce( 
                        function(acc, x, i) {
                            acc[x.value] = lambdaArguments[i];
                            return acc;
                            }, {}                    )
                var newContext = new Context(lambdaScope, context);
                var lambda_res = interpret(input[2], newContext);
                console.log("lambda_res; ", lambda_res);
                return lambda_res;
            }
        }
    }

/*******                Interpreter                      ******/
    var interpretList = function(input, context) {
        console.log("-- INTERPRET LIST: ", input);
        if (input.length > 0 && input[0].value in special) {
            console.log("is special: ", input[0]);
            var special_return = special[input[0].value](input, context);
            console.log("special_return", special_return);
            return special_return;
        } else { // non-special form
            console.log("Not Special input:", input);
            var list = input.map( // interpret every node in the list
                function(x) {
                    var map_res = interpret(x, context);
                    return map_res; 
                }               );
            if (list[0] instanceof Function) { // intrinsic JS function
                var apply_result = list[0].apply(undefined, list.slice(1)); // apply: each list element becomes an actual arg 
                console.log("apply_result: ", apply_result);
                return apply_result;
            } else {
                return list;
            }
        }
    }
    
    var interpret = function(input, context) {
        console.log("INTERPRET: ", input);
        if (context === undefined) {
            console.log("no context: ");
            return interpret(input, new Context(library) )
        } else if (input instanceof Array) {
            console.log("is Array: ", input);
            return interpretList(input, context); // Old way
        } else if (input.type === "expr") {
            console.log("is Expr obj: ", input);
            return interpretList(input.value, context); // New way
        } else if (input.type === "identifier") {
            console.log("is identifier: ", input);
            return context.get(input.value);
        } else if (input.type === "number") {
            console.log("is number: ", input);
            return input.value;
        }
    }
    
/*******                Main Loop                      ******/
    function main(){
        tokenArray = sourceCode.replace(/\(/g, " ( ")
                               .replace(/\[/g, " [ ")
                               .replace(/\]/g, " ] ")
                               .replace(/\)/g, " ) ")
                               .trim()
                               .split(/\s+/);
        console.log(tokenArray);

        ast = parenthesize(tokenArray);
        console.log(ast);

        var final_res = interpret(ast);
        console.log("Final Result: ", final_res);

        drawAll();
    }
    //setInterval(drawAll, 16);  // run faster for debugging
    document.addEventListener('DOMContentLoaded', main, false); // start when ready
})   ();
