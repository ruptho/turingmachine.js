module.exports = function(grunt) {

grunt.initConfig({
  concat: {
    basic: {
      src: ['src/**/*.js'],
      dest: 'turingmachine.js',
    }
  }
});

grunt.loadNpmTasks('grunt-contrib-concat');

// Default task(s).
grunt.registerTask('default', ['concat']);

};


