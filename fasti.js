// Force directed Abstract Syntax Tree Interpreter Copyright Charles Li

(function () {
    "use strict";
    var canvas = document.getElementById("myCanvas");
    var ctx = canvas.getContext("2d");
/*******                Data                     ******/
    //var sourceCode = "( ( lambda ( a b ) (+ a b) ) 8 55 )";
    var sourceCode = "( ( lambda (x) x ) 3 )";
    //var sourceCode = "(+ 3 5)";
    //var sourceCode = "(1 2 3)";
    var tokenArray = [];
    var ast = [];

/*******         Vector Library                      ******/
    function vector(x, y) {
        if ( !(this instanceof vector) ) { // dont need new
           var new_vec = new vector(x, y);
           return new_vec;
        }
        this.x = x || 0;
        this.y = y || 0;
    };

	vector.prototype.neg = function() {
		return new vector(this.x * -1, this.y * -1 );
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
		return Math.sqrt(this.x * this.x + this.y * this.y);
	};

	vector.prototype.magnitudeSquared = function() {
		return this.x * this.x + this.y * this.y;
	};
    
	vector.prototype.normalize = function() {
		return this.divide(this.magnitude());
	};

    var deltaRightVector = new vector(77,0);
    var deltaDownVector = new vector(0,77);

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
                retArray.push( { type : "expr" , value : "()", sexpr : parenthesize(tokenList) } ); // recursive
            } else if(curToken === ")") {
                return retArray;
            } else {
                retArray.push( categorize(curToken) );
                console.log("parenthesize ", retArray);
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
    var interpretList = function(input, context) {
        if (context === undefined) { // first time in, create primative library
            return interpretList(input, new Context(library) ); // Recurse -- load lib
        } else if (input[0].value === "if") { // special form
            input[1].result = interpret( input[1], context );
            // yield 
            if ( input[1].result ) { // Recurse
                input[2].result = interpret( input[2], context ); // Recurse consequence
                // yield
                return input[2].result;
            } else {
                input[3].result = interpret( input[3], context ); // Recurse alternative
                // yield
                return input[3].result;
            }
        } else if (input[0].value === "lambda") { // special form
            return function() {
                var lambdaArguments = arguments;
                var lambdaScope = input[1].sexpr.reduce( // construct new scope
                        function(acc, x, i) {
                            acc[x.value] = lambdaArguments[i];
                            return acc;
                            }, {}                      )
                var newContext = new Context(lambdaScope, context);
                return interpret(input[2], newContext); // Recurse
            }
        } else { // non-special form
            var list = input.map( // interpret every node in the list
                function(x) {
                    var map_res = interpret(x, context); // Recurse
                    return map_res; 
                }               );
            if (list[0] instanceof Function) { // apply JS function <========== THIS NEEDS TO CHANGE FOR GENERATOR
                return list[0].apply(undefined, list.slice(1)); // apply: each list element becomes an actual arg 
            } else {
                return list;
            }
        }
    };
    
    var interpret = function(input, context) {
        if (input.type === "expr") { // Expression
             input.result = interpretList(input.sexpr, context); // Recurse
             // yield
             return input.result;
        } else if (input.type === "identifier") { // Variable
            input.result = context.get(input.value);
            // yield
            return input.result;
        } else if (input.type === "number") { // Literal
            input.result = input.value;
            // yield
            return input.result;
        } else {
            console.log("Warning: interpret can not handle atom type", input.type);
        }
    };

/*******                Visualizer                      ******/
    var visualizeList = function(input, position) { // TODO: break up pos init from visualize
        var curPosition = position;
        for(var i = 0; i < input.length; i++){
            visualize(input[i], curPosition);
            curPosition = curPosition.add(deltaRightVector);
        }
        return;
    };

    var visualize = function(input, position) { // TODO: break up pos init from visualize
        if (position === undefined) {
            return visualize(input, new vector(canvas.width/2,  canvas.height/8) );
        } else if (input === undefined) {
            return;
        } else if (input instanceof Array) {
            visualizeList(input, position);
            return;
        } else { 
            if (input.pos === undefined) {
                input.pos = new vector(position.x, position.y);
            }
            
            drawRect(input.pos);
            drawText(input.value, input.pos);

            if (input.result !== undefined) {
                drawText(input.result, input.pos.add( new vector(0,22) ));
            }
            
            if (input.type === "expr") {
                visualizeList(input.sexpr, position.add(deltaDownVector) );
            }
            return;
        }
    };

    var springLength = 77;
    var springConstant = 1; 
   
    var applySpring = function(inputA, inputB) {
        var d = inputB.pos.subtract(inputA.pos);
        var displacement = d.magnitude() - springLength; // core
        var direction = d.normalize();

        if (inputA.a === undefined){
            console.log("Creat new A acceleration");
            inputA.a = new vector(0, 0);
        }
        if (inputB.a === undefined){
            console.log("Creat new B acceleration");
            inputB.a = new vector(0, 0);
        }
        
        var delta_a = direction.multiply(springConstant * displacement * 0.5 )

        inputA.a = inputA.a.add( delta_a );  // core
        inputB.a = inputB.a.add( delta_a.neg() ); // core

        return;
    };

    var timestep = 0.01; // Time Step -- super important
    var damping = 0.9;

    var updateVelocity = function(input) {
        console.log("updateVelocity");

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
                
                input.v = input.v.multiply(damping); // damping
                input.a = input.a.multiply(damping); // ~2-3% surplus acc

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
        if(prev !== undefined){ // apply spring to parent "expr" node
            for(var i = 0; i < input.length; i++) {
                applySpring(input[i], prev);
            }
        }
            
        for(var i = 1; i < input.length; i++) {
            applySpring(input[i-1], input[i-0]);
        }
            
        for(var i = 0; i < input.length; i++) {
            if (input[i].type === "expr") {
                springList(input[i].sexpr, input[i]);
            }
        }
    };
    
    var chargeConstant = 50000; // same for now
    
    var applyRepulsion = function(inputA, inputB){
        console.log("Apply Repulsion: ", inputA, inputB);
        
        var d = inputB.pos.subtract(inputA.pos); // TODO: when input1 and input2 pos overlap
        var d_magSquared = d.magnitudeSquared(); // denominator
        var direction = d.normalize(); // unit length
        
        if (inputA.a === undefined){
            console.log("Creat new A acceleration applyRepulsion ");
            inputA.a = new vector(0, 0);
        }
        if (inputB.a === undefined){
            console.log("Creat new B acceleration applyRepulsion ");
            inputB.a = new vector(0, 0);
        }

        var delta_a = direction.multiply(0.5 * chargeConstant / d_magSquared )
        console.log("delta_a ", delta_a)
        
        inputA.a = inputA.a.add( delta_a.neg() );  // core
        inputB.a = inputB.a.add( delta_a ); // core

        return;
    }
    
    var DFT = function(input, other) {
        // For each node, transverse AST again and apply 
        if(other === undefined) {
            console.log("Second round");
            DFT_list(ast, input); // O(N^2)
        } else {
            if(input !== other){
                applyRepulsion(input, other);
            }
        }

        if(input.type === "expr") {
            console.log("DFT is expr", input);
            DFT_list(input.sexpr, other); // recurse
        }

        return;
    };
    
    var DFT_list = function(input, other) {
        console.log("DFT_List: ", input, " length ", input.length, "other ", other);
        for(var i = 0; i < input.length; i++){
            DFT(input[i], other);
        }
        return;
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


        var frame = 0;
        var drawCall = function() { // core
            /*
            if(frame > 120) { // First method stop
                console.log("cleaInterval", drawIntervalID);
                window.clearInterval(drawIntervalID);
            }
            */
            console.log("drawCall", frame++);
            ctx.clearRect(0, 0, canvas.width, canvas.height); // clear screen
            drawText("Frame: " + frame, {x:30, y:30}); // frame counter upper left
            visualize(ast);
            springList(ast);
            DFT_list(ast);
            updatePositionList(ast);
            updateVelocityList(ast);

            
                window.requestAnimationFrame(drawCall);
            }
            return;
        }
        //var drawIntervalID = window.setInterval(drawCall, 5); // First method start (2nd arg ms)
        drawCall(); // Second Method - start

        var final_res = interpretList(ast); // core - start with array
        console.log(">>> Final Result: ", final_res);

/*
        var gen = interpretList(ast);

        var genOne = gen.next();
        console.log("gen One: ", genOne);

        var genTwo = gen.next();
        console.log("gen Two: ", genTwo);

        gen.next();
        gen.next();
        gen.next();
*/
        return;
    }

    document.addEventListener('DOMContentLoaded', main, false); // start when ready
})   ();
