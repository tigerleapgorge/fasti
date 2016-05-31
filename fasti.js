// Force directed Abstract Syntax Tree Interpreter Copyright Charles Li

(function () {
    "use strict";
    var canvas = document.getElementById("myCanvas");
    var ctx = canvas.getContext("2d");
/*******                Data                     ******/
    //var sourceCode = "( ( lambda ( a b ) (+ a b) ) 8 55 )";
    //var sourceCode = "( ( lambda (x) x) 3)";
    var sourceCode = "(+ 3 5)";
    var tokenArray = [];
    var ast = [];

/*******                Vector                      ******/
    function vector(x, y) {
        if ( !(this instanceof vector) ) { // dont need new
           var new_vec = new vector(x, y);
           return new_vec;
        }
        this.x = x || 0;
        this.y = y || 0;
    };

	vector.prototype.add = function(vecArg) {
        return new vector(this.x + vecArg.x, this.y + vecArg.y);
	};
    
	vector.prototype.subtract = function(v2) {
		return new vector(this.x - v2.x, this.y - v2.y);
	};

	vector.prototype.multiply = function(n) {
		return new vector(this.x * n, this.y * n);
	};
    
	vector.prototype.divide = function(n) {
		return new vector( (this.x / n) || 0,
                           (this.y / n) || 0);
	};
    
	vector.prototype.magnitude = function() {
		return Math.sqrt(this.x*this.x + this.y*this.y);
	};
    
	vector.prototype.normalize = function() {
		return this.divide(this.magnitude());
	};

    var deltaRightVector = new vector(50,0);
    var deltaDownVector = new vector(0,50);

/*******                Graphics                      ******/
    function drawText(myStr, posVector){
        ctx.font = "25px Arial";
        ctx.fillStyle = "#0095DD";
        ctx.fillText(myStr, posVector.x-10, posVector.y+7);
    }

    function drawRect(position){
        //console.log("drawRect ", position);
        ctx.fillStyle = "green";
        ctx.fillRect(position.x, position.y, 20, 20);

    }

    function drawAll(){ // draw loop
        ctx.clearRect(0, 0, canvas.width, canvas.height); // clear screen

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
                retArray.push( { type : "expr" , sexpr : parenthesize(tokenList) } ); // recursive
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
    };
    
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
    };

/*******                Interpreter                      ******/
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
                var lambdaScope = input[1].sexpr.reduce( 
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
    };

    var interpretList = function(input, context) {
        console.log("INTERPRET LIST: ", input);
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
    };
    
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
            return interpretList(input.sexpr, context); // New way
        } else if (input.type === "identifier") {
            console.log("is identifier: ", input);
            return context.get(input.value);
        } else if (input.type === "number") {
            console.log("is number: ", input);
            return input.value;
        }
    };

    var visualizeList = function(input, position) {
        var curPosition = position;
        for(var i = 0; i < input.length; i++){
            //console.log("visualizeList ", curPosition);
            visualize(input[i], curPosition);
            curPosition = curPosition.add(deltaRightVector);
        }
        return;
    };

    var visualize = function(input, position) {
        //console.log("In visualize");
        if (position === undefined) {
            //console.log("Vis no position");
            return visualize(input, new vector(canvas.width/2,  canvas.height/8) );
        } else if (input === undefined) {
            //console.log("Vis no input");
            return;
        } else if (input instanceof Array) {
            //console.log("Vis Array");
            visualizeList(input, position);
            return;
        } else { 
            //console.log("Vis Else", input.pos, position);
            if (input.pos === undefined) {
                input.pos = new vector(position.x, position.y);
            }
            
            drawRect(input.pos);
            if(input.type !== "expr") {
                drawText(input.value, input.pos);
            }
            
            if (input.type === "expr") {
                visualizeList(input.sexpr, position.add(deltaDownVector) );
            }
            return;
        }
    };

   
    var applySpring = function(inputA, inputB) {
        var d = inputA.pos.subtract(inputB.pos);
        var displacement = 20 - d.magnitude(); // spring length is 50
        var direction = d.normalize();
        
        console.log("inputA.pos ", inputA.pos);
        console.log("inputB.pos ", inputB.pos);
        console.log("d ", d);
        console.log("d.magnitude ", d.magnitude);
        console.log("d.normalize ", d.normalize);
        console.log("direction ", direction);
        console.log("displacement", displacement);
        
        if (inputA.a === undefined){
            inputA.a = new vector(0, 0);
        }
        if (inputB.a === undefined){
            inputB.a = new vector(0, 0);
        }
        
        console.log("inputA.a ", inputA.a);
        
        inputA.a = inputA.a.add( direction.multiply(0.05 * displacement * -0.5 ) );
        inputB.a = inputB.a.add( direction.multiply(0.05 * displacement * 0.5 ) );
        
        console.log("inputA.a ", inputA.a);
        console.log(" direction.multiply(50 * displacement * -0.5 )",  direction.multiply(50 * displacement * -0.5 ) );
        console.log("inputB.a ", inputB.a);
        console.log("inputA.a ", inputA.a);
        
        return;
    };

    var timestep = 0.01; // Time Step -- super important

    var updateVelocity = function(input) {
        console.log("updateVelocity");
        console.log("updateVelocity input", input);
        if(input instanceof Array) {
            updateVelocityList(input);
        } else {
            if(input.a === undefined){
                console.log("updateVelocity lack acceleration", input);
            } else {
                if(input.v === undefined) { // if veloctiy don't exist, initialize it
                    input.v = new vector(0,0);
                }
                input.v = input.v.add( input.a.multiply(timestep) ); // Core
                
                 
                console.log("Update Velocity: ", input);
                console.log("Update Velocity acceleration: ", input.a);
                console.log("Update Velocity velocity: ", input.v);
                if(input.type === "expr") { // is paren atom
                    updateVelocityList(input.sexpr); // DFS
                }
            }
        }
    };
    var updateVelocityList = function(input) {
        console.log("updateVelocityList");
        for(var i = 0; i < input.length; i++){
            updateVelocity(input[i]);
        }
    };

    var updatePosition = function(input) {
        console.log("updatePosition", input);
        if(input instanceof Array) {
            updatePositionList(input);
        } else {
            if (input.v !== undefined) { // make sure velocity exist
                /*
                if(input.pos === undefined) { // if veloctiy don't exist, initialize it
                    input.pos = new vector(0,0);
                }
                */
                input.pos = input.pos.add( input.v.multiply(timestep) ); // Core 
                if(input.type === "expr") { // is paren atom
                    updatePositionList(input.sexpr); // DFS
                    
                }
            }
        }
    };
    var updatePositionList = function(input) {
        console.log("updatePositionList", input);
        for(var i = 0; i < input.length; i++){
            updatePosition(input[i]);
        }
    };
    
    
    var springList = function(input, prev) {
        //console.log("springList");
        if (input === undefined ) {
            //console.log("springList NO input");
            return;
        } else if ( !(input instanceof Array) ) {
            //console.log("springList Not Array");
            return;
        } else {
            //console.log("input.length: ", input.length);
            if(prev !== undefined){
                for(var i = 0; i < input.length; i++) {
                    applySpring(input[i], prev);
                }
            }
            
            for(var i = 1; i < input.length; i++) {
                //console.log("springList action: ", input[i-1]);
                // input[i-1].pos.x += 1; shift to the right by 1px
                applySpring(input[i], input[i-1]);
            }
            for(var i = 0; i < input.length; i++) {
                //console.log("springList Recurse: ", input[i]);
                if (input[i].type === "expr") {
                    springList(input[i].sexpr, input[i]);
                }
            }
        }
        
    };
    
    var DFT = function(input) {
        if (input instanceof Array) {
            DFT_list(input);
        } else {
            console.log("DFT ", input);
            if(input.type === "expr") {
                DFT_list(input.sexpr);
            }
        }
    };
    
    var DFT_list = function(input) {
        for(var i = 0; i <= input.length; i++){
            DFT(input[i]);
        }
    };
    
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
        
        console.log("ast ", ast);
        console.log("type of ast: ", typeof ast);
        console.log("ast is array: ", ast instanceof Array);

/*
            ctx.clearRect(0, 0, canvas.width, canvas.height); // clear screen
            visualize(ast);
            springList(ast);
            
            console.log("----------------------");
            updateVelocityList(ast);
            updatePositionList(ast);
            console.log("++++++++++++++++++++++");
*/

  

        var frame = 0;
        var drawCall = function() {
            
            console.log("drawCall", frame++);
            ctx.clearRect(0, 0, canvas.width, canvas.height); // clear screen
            visualize(ast);
            springList(ast);
            updateVelocityList(ast);
            updatePositionList(ast);
        }
        window.setInterval(drawCall, 50);


//        visualize(ast);
//        springList(ast);

//        var final_res = interpret(ast);
//        console.log("Final Result: ", final_res);

        //drawAll();
    }
    //setInterval(drawAll, 16);  // run faster for debugging
    document.addEventListener('DOMContentLoaded', main, false); // start when ready
})   ();
