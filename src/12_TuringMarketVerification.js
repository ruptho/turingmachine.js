// ---------------------- TuringMarket verification -----------------------

// verifyProgram: Verify correctness of market's program data
var verifyProgram = function (dat) {
  // map
  //   'title'          required, string
  //   'description'    optional, array of strings/maps, default []
  //   'version'        required, string
  //   'tape'           required, map
  //       'blank'         optional, string, default "0"
  //       'offset'        optional, integer, default 0
  //       'cursor'        optional, integer, default -1
  //       'data'          required, array of strings, len>=0
  //   'program'        optional, array of homogeneous elements, default []
  //       homogeneous elements: array of 5 strings
  //           [3] satisfies       is choice from ["LEFT", "RIGHT", "STOP"]
  //   'state'          required, string
  //   'final_states'   required, array of strings, len>=1
  //   'testcases'      optional, array of homogeneous elements, len>=0
  //       homogeneous elements: map
  //            'name'             required, string, len>=3
  //            'input'            required, map
  //                 'tape'              required, same layout as above
  //                 'state'             required, string
  //            'output'           required, len>=1
  //                 'state'             optional, string
  //                 'tapecontent'       optional, array of strings, len>=0
  //                 'cursorposition'    optional, integer

  // output['state'] will be satisfied if and only if
  //   the final state equals output['state']
  //   hence output['state'] must be declared as final state
  // output['tapecontent'] will be satisfied if and only if
  //   if the output['tapecontent'] equals tape values array (with blank symbols stripped from left and right)
  // output['cursorposition'] will be satisfied if and only if
  //   if the final cursor position matches the index of the cursor in output['tapecontent']
  //   hence output['cursorposition'] requires definition of output['tapecontent']

  var title_schema = { 'type': 'string', 'minLength': 3 };
  var description_schema = {
    'type': 'array',
    'minItems': 0,
    'items': {
      'oneOf': [{ 'type': 'string' }, { 'type': 'object' }]
    }
  };
  var version_schema = { 'type': 'string', 'minLength': 3 };
  var tape_schema = {
    'type': 'object',
    'properties': {
      'blank': { 'type': 'string', 'default': "0" },
      'offset': { 'type': 'integer', 'default': 0 },
      'cursor': { 'type': 'integer', 'default': -1 },
      'data': { 'type': 'array', 'minItems': 0, 'items': { 'type': 'string' } }
    },
    'additionalProperties': false,
    'required': ['data']
  };
  var program_schema = {
    'type': 'array',
    'minItems': 0,
    'items': {
      'type': 'array',
      'minItems': 5,
      'maxItems': 5,
      'items': [
        { 'type': 'string' },
        { 'type': 'string' },
        { 'type': 'string' },
        { 'type': 'string', 'pattern': '^(LEFT|RIGHT|STOP)$' },
        { 'type': 'string' }
      ]
    },
    'uniqueItems': true
  };
  var state_schema = { 'type': 'string', 'minLength': 1 };
  var final_states_schema = { 'type': 'array', 'minItems': 1, 'items': { 'type': 'string' } };
  var testcase_schema = {
    'type': 'array',
    'minItems': 0,
    'items': {
      'type': 'object',
      'properties': {
        'name': { 'type': 'string', 'minLength': 1 },
        'input': {
          'type': 'object',
          'properties': {
            'tape': tape_schema,
            'state': state_schema
          },
          'required': ['tape', 'state'],
          'additionalProperties': false
        },
        'output': {
          'type': 'object',
          'properties': {
            'state': state_schema,
            'tapecontent': { 'type': 'array', 'minItems': 0, 'items': { 'type': 'string' }},
            'cursorposition': { 'type': 'integer' }
          },
          'minProperties': 1,
          'additionalProperties': false
        },
      },
      'required': ['name', 'input', 'output'],
      'additionalProperties': false
    }
  };

  var schema = {
    '$schema': 'http://json-schema.org/draft-04/schema#',
    'title': 'Turingmarket Schema',
    'type': 'object',
    'properties': {
      'title': title_schema,
      'description': description_schema,
      'version': version_schema,
      'tape': tape_schema,
      'program': program_schema,
      'state': state_schema,
      'final_states': final_states_schema,
      'testcases': testcase_schema
    },
    'additionalProperties': false,
    'required': ['title', 'tape', 'state', 'final_states']
  };

  var env = jjv();
  env.addSchema('market', schema);

  return env.validate('market', dat);
};


