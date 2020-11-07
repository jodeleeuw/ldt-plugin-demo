/**
 * jspsych-audio-ldt
 **/

jsPsych.plugins["audio-ldt"] = (function() {

  var plugin = {};

  jsPsych.pluginAPI.registerPreload('audio-ldt', 'audio', 'audio');

  plugin.info = {
    name: 'audio-keyboard-response',
    description: '',
    parameters: {
      audio: {
        type: jsPsych.plugins.parameterType.AUDIO,
        default: undefined,
      },
      words: {
        type: jsPsych.plugins.parameterType.COMPLEX,
        nested: {
          word: {
            type: jsPsych.plugins.parameterType.STRING,
            default: undefined
          },
          validity: {
            type: jsPsych.plugins.parameterType.STRING,
            default: undefined
          },
          category: {
            type: jsPsych.plugins.parameterType.STRING,
            default: undefined
          }
        }
      },
      valid_key: {
        type: jsPsych.plugins.parameterType.KEYCODE,
        default: 'y',
      },
      invalid_key: {
        type: jsPsych.plugins.parameterType.KEYCODE,
        default: 'n',
      },
      trial_ends_after_audio: {
        type: jsPsych.plugins.parameterType.BOOL,
        default: true
      },
    }
  }

  plugin.trial = function(display_element, trial) {

    var trial_data = {}
    trial_data.rt = [];
    trial_data.key = [];
    trial_data.correct = [];
    trial_data.validity = [];
    trial_data.category = [];

    // setup audio stimulus, including call to end_trial
    // when the audio file ends.
    var context = jsPsych.pluginAPI.audioContext();
    if(context !== null){
      var source = context.createBufferSource();
      source.buffer = jsPsych.pluginAPI.getAudioBuffer(trial.audio);
      source.connect(context.destination);
      if(trial.trial_ends_after_audio){
        source.onended = function() {
          end_trial();
        }
      }
    } else {
      var audio = jsPsych.pluginAPI.getAudioBuffer(trial.audio);
      audio.currentTime = 0;
      if(trial.trial_ends_after_audio){
        audio.addEventListener('ended', end_trial);
      }
    }

    // show fixation
    display_element.innerHTML = `<p style="font-size: 32px;">+</p>`
  
    // start audio
    if(context !== null){
      startTime = context.currentTime;
      source.start(startTime);
    } else {
      audio.play();
    }

    jsPsych.pluginAPI.setTimeout(next_ldt, trial.fixation_duration)

    function next_ldt() {
      var current_trial = trial_data.rt.length;
      display_element.innerHTML = trial.words[current_trial].word;
      jsPsych.pluginAPI.getKeyboardResponse({
        callback_function: after_response,
        valid_responses: [trial.valid_key, trial.invalid_key],
        rt_method: 'performance',
        persist: false,
        allow_held_key: false
      });
    }

    // function to handle responses by the subject
    function after_response(info) {
      var current_trial = trial_data.rt.length;
      trial_data.rt[current_trial] = info.rt;
      trial_data.key[current_trial] = info.key;
      trial_data.validity[current_trial] = trial.words[current_trial].validity;
      trial_data.category[current_trial] = trial.words[current_trial].category;
      trial_data.correct[current_trial] = trial_data.validity[current_trial] == 'valid' ? jsPsych.pluginAPI.compareKeys(info.key, trial.valid_key) : jsPsych.pluginAPI.compareKeys(info.key, trial.invalid_key);
      if(current_trial == trial.words.length - 1) {
        end_trial();
      } else {
        next_ldt();
      }
    };

    // function to end trial when it is time
    function end_trial() {

      // kill any remaining setTimeout handlers
      jsPsych.pluginAPI.clearAllTimeouts();

      // stop the audio file if it is playing
      // remove end event listeners if they exist
      if(context !== null){
        source.stop();
        source.onended = function() { }
      } else {
        audio.pause();
        audio.removeEventListener('ended', end_trial);
      }

      // kill keyboard listeners
      jsPsych.pluginAPI.cancelAllKeyboardResponses();

      // clear the display
      display_element.innerHTML = '';

      trial_data.rt = JSON.stringify(trial_data.rt);
      trial_data.key = JSON.stringify(trial_data.key);
      trial_data.correct = JSON.stringify(trial_data.correct);
      trial_data.validity = JSON.stringify(trial_data.validity);
      trial_data.category = JSON.stringify(trial_data.category);

      // move on to the next trial
      jsPsych.finishTrial(trial_data);
    };

  };

  return plugin;
})();
