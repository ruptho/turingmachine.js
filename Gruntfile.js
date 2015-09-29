module.exports = function(grunt) {

grunt.initConfig({
  concat: {
    basic: {
      src: ['src/0basic.js', 'src/1symbol.js', 'src/2state.js', 'src/3motion.js',
            'src/4position.js', 'src/5instrtuple.js', 'src/6program.js', 'src/7tape.js',        
            'src/8machine.js', 'src/9visualization.js', 'src/10turingmanager.js', 
            'src/11foswiki.js', 'src/12verification.js', 'src/13main.js'],
      dest: 'turingmachine.js',
    }
  }
});

grunt.loadNpmTasks('grunt-contrib-concat');

// Default task(s).
grunt.registerTask('default', ['concat']);

};


