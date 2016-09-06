// FASTI: Force-directed Abstract Syntax Tree Interpreter 
// Copyright (C) 2016 Charles Li

/*******         Vector Library                     ******/
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
		return new vector( (this.x / n) || 0, (this.y / n) || 0);
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