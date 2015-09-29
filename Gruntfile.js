module.exports = function (grunt) {

    grunt.initConfig({
        concat: {
            basic: {
                src: ['src/**/*.js'],
                dest: 'turingmachine.js',
            }
        },
        watch: {
            default: {
                files: ['<%= concat.basic.src %>'],
                tasks: ['default']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-watch');

// Default task(s).
    grunt.registerTask('default', ['concat']);

};


