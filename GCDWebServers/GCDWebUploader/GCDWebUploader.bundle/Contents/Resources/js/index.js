/*
 Copyright (c) 2012-2015, Pierre-Olivier Latour
 All rights reserved.
 
 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright
 notice, this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright
 notice, this list of conditions and the following disclaimer in the
 documentation and/or other materials provided with the distribution.
 * The name of Pierre-Olivier Latour may not be used to endorse
 or promote products derived from this software without specific
 prior written permission.
 
 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL PIERRE-OLIVIER LATOUR BE LIABLE FOR ANY
 DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var ENTER_KEYCODE = 13;

var _path = null;
var _pendingReloads = [];
var _reloadingDisabled = 0;

function formatFileSize(bytes) {
  if (bytes >= 1000000000) {
    return (bytes / 1000000000).toFixed(2) + ' GB';
  }
  if (bytes >= 1000000) {
    return (bytes / 1000000).toFixed(2) + ' MB';
  }
  return (bytes / 1000).toFixed(2) + ' KB';
}

function _showError(message, textStatus, errorThrown) {
  //alert('txtStatus = ' + textStatus + ' errThr = '+ errorThrown);
  // ++ Keivn 2017-4-24  中文适配
  if(errorThrown === 'Forbidden')
      errorThrown = '禁止';
  if(textStatus === 'error')
      textStatus = '错误';
  // ++ Keivn 2017-4-24
    
  $("#alerts").prepend(tmpl("template-alert", {
    level: "danger",
    title: (errorThrown != "" ? errorThrown : textStatus) + ": ",
    description: message
  }));
}

function _disableReloads() {
  _reloadingDisabled += 1;
}

function _enableReloads() {
  _reloadingDisabled -= 1;
  
  if (_pendingReloads.length > 0) {
    _reload(_pendingReloads.shift());
  }
}

function _reload(path) {
  if (_reloadingDisabled) {
    if ($.inArray(path, _pendingReloads) < 0) {
      _pendingReloads.push(path);
    }
    return;
  }
  
  _disableReloads();
  $.ajax({
    url: 'list',
    type: 'GET',
    data: {path: path},
    dataType: 'json'
  }).fail(function(jqXHR, textStatus, errorThrown) {
   // _showError("Failed retrieving contents of \"" + path + "\"", textStatus, errorThrown);
    //_showError("手机Wifi传输页面已关闭，获取文件夹列表失败 \"" + path + "\"", textStatus, errorThrown);
          
          
  }).done(function(data, textStatus, jqXHR) {
    console.log('data = ' + data);
    var scrollPosition = $(document).scrollTop();
    
    if (path != _path) {
      $("#path").empty();
      if (path == "/") {
        $("#path").append('<li class="active">' + _device + '</li>');
        
        $("#upload-file").attr("disabled","disabled");
        $(".page-header").eq(0).next().text("请先选择要上传的文件夹.")
      } else {
        
        $("#upload-file").removeAttr("disabled");
        $(".page-header").eq(0).next().text("拖拽文件到此窗口或者点击上传文件按钮来上传文件.")
          
        $("#path").append('<li data-path="/"><a>' + _device + '</a></li>');
        var components = path.split("/").slice(1, -1);
        for (var i = 0; i < components.length - 1; ++i) {
          var subpath = "/" + components.slice(0, i + 1).join("/") + "/";
          $("#path").append('<li data-path="' + subpath + '"><a>' + components[i] + '</a></li>');
        }
        $("#path > li").click(function(event) {
          
          _reload($(this).data("path"));
          event.preventDefault();
        });
        $("#path").append('<li class="active">' + components[components.length - 1] + '</li>');
      }
      _path = path;
    }
    
    $("#listing").empty();
    for (var i = 0, file; file = data[i]; ++i) {
      $(tmpl("template-listing", file)).data(file).appendTo("#listing");
    }
    
    $(".edit").editable(function(value, settings) { 
      var name = $(this).parent().parent().data("name");
      if (value != name) {
        var path = $(this).parent().parent().data("path");
        $.ajax({
          url: 'move',
          type: 'POST',
          data: {oldPath: path, newPath: _path + value},
          dataType: 'json'
        }).fail(function(jqXHR, textStatus, errorThrown) {
          _showError("Failed moving \"" + path + "\" to \"" + _path + value + "\"", textStatus, errorThrown);
        }).always(function() {
          _reload(_path);
        });
      }
      return value;
    }, {
      onedit: function(settings, original) {
        _disableReloads();
      },
      onsubmit: function(settings, original) {
        _enableReloads();
      },
      onreset: function(settings, original) {
        _enableReloads();
      },
      tooltip: 'Click to rename...'
    });
    
    $(".button-download").click(function(event) {
      var path = $(this).parent().parent().data("path");
      setTimeout(function() {
        window.location = "download?path=" + encodeURIComponent(path);
      }, 0);
    });
    
    $(".button-open").click(function(event) {
      var path = $(this).parent().parent().data("path");
      //console.log('path = ' + path);  当前文件夹路径
//      $("#upload-file").removeAttr("disabled");
      _reload(path);
    });
    
    //add one line by KevinJ 2017-4-18 文件夹列表显示时，不显示移动按钮
    //$(".button-move").css("display",((_path === "/")?("none"):("block")));
    $(".button-move").css("display","none");  //暂时先全部禁用，后续优化升级，完成文件夹的列表选择
          
    $(".button-move").click(function(event) {
      var path = $(this).parent().parent().data("path");
      if (path[path.length - 1] == "/") {
        path = path.slice(0, path.length - 1);
      }
      $("#move-input").data("path", path);
      $("#move-input").val(path);
      $("#move-modal").modal("show");
    });
    
    $(".button-delete").click(function(event) {
      var path = $(this).parent().parent().data("path");
      $.ajax({
        url: 'delete',
        type: 'POST',
        data: {path: path},
        dataType: 'json'
      }).fail(function(jqXHR, textStatus, errorThrown) {
        _showError("文件删除失败 \"" + path + "\"", textStatus, errorThrown);
      }).always(function() {
        _reload(_path);
      });
    });
    
    $(document).scrollTop(scrollPosition);
  }).always(function() {
    _enableReloads();
  });
}

$(document).ready(function() {
  
  // Workaround Firefox and IE not showing file selection dialog when clicking on "upload-file" <button>
  // Making it a <div> instead also works but then it the button doesn't work anymore with tab selection or accessibility
  $("#upload-file").click(function(event) {
    $("#fileupload").click();
  });
  
  // Prevent event bubbling when using workaround above
  $("#fileupload").click(function(event) {
    event.stopPropagation();
  });
  
  $("#fileupload").fileupload({
    dropZone: $(document),
    pasteZone: null,
    autoUpload: true,
    sequentialUploads: true,
    // limitConcurrentUploads: 2,
    // forceIframeTransport: true,
    
    url: 'upload',
    type: 'POST',
    dataType: 'json',
    
    start: function(e) {
      $(".uploading").show();
    },
    
    stop: function(e) {
      $(".uploading").hide();
    },
    
    add: function(e, data) {
      var file = data.files[0];
      data.formData = {
        path: _path
      };
      data.context = $(tmpl("template-uploads", {
        path: _path + file.name
      })).appendTo("#uploads");
      var jqXHR = data.submit();
      data.context.find("button").click(function(event) {
        jqXHR.abort();
      });
    },
    
    progress: function(e, data) {
      var progress = parseInt(data.loaded / data.total * 100, 10);
      data.context.find(".progress-bar").css("width", progress + "%");
    },
    
    done: function(e, data) {
      _reload(_path);
    },
    
    fail: function(e, data) {
      var file = data.files[0];
      if (data.errorThrown != "abort") {
    //++ Keivn 2017-4-27  上传重复密文，提示用户不可上传
    if(data.errorThrown === "Not Found")
    {
        _showError("文件上传失败 \"" + file.name + "\" to \"" + _path + "\" 请注意加密文件名称是否重复", data.textStatus, "错误");
        return;
    }
    //++ Keivn 2017-4-27
        _showError("文件上传失败 \"" + file.name + "\" to \"" + _path + "\"", data.textStatus, data.errorThrown);
      }
    },
    
    always: function(e, data) {
      data.context.remove();
    },
    
  });
  
  $("#create-input").keypress(function(event) {
    if (event.keyCode == ENTER_KEYCODE) {
      $("#create-confirm").click();
    };
  });
  
  $("#create-modal").on("shown.bs.modal", function(event) {
    $("#create-input").focus();
    $("#create-input").select();
  });
  
  $("#create-folder").click(function(event) {
    $("#create-input").val("无标题的文件夹");
    $("#create-modal").modal("show");
  });
  
  $("#create-confirm").click(function(event) {
    $("#create-modal").modal("hide");
    var name = $("#create-input").val();
    if (name != "") {
      $.ajax({
        url: 'create',
        type: 'POST',
        data: {path: _path + name},
        dataType: 'json'
      }).fail(function(jqXHR, textStatus, errorThrown) {
        _showError("创建文件夹失败 \"" + name + "\" in \"" + _path + "\"", textStatus, errorThrown);
      }).always(function() {
        _reload(_path);
      });
    }
  });
  
  $("#move-input").keypress(function(event) {
    if (event.keyCode == ENTER_KEYCODE) {
      $("#move-confirm").click();
    };
  });
  
  $("#move-modal").on("shown.bs.modal", function(event) {
    $("#move-input").focus();
    $("#move-input").select();
  })
  
  $("#move-confirm").click(function(event) {
    $("#move-modal").modal("hide");
    var oldPath = $("#move-input").data("path");
    var newPath = $("#move-input").val();
    if ((newPath != "") && (newPath[0] == "/") && (newPath != oldPath)) {
      $.ajax({
        url: 'move',
        type: 'POST',
        data: {oldPath: oldPath, newPath: newPath},
        dataType: 'json'
      }).fail(function(jqXHR, textStatus, errorThrown) {
        _showError("Failed moving \"" + oldPath + "\" to \"" + newPath + "\"", textStatus, errorThrown);
      }).always(function() {
        _reload(_path);
      });
    }
  });
  
  $("#reload").click(function(event) {
    _reload(_path);
  });
  
  _reload("/");
  
});
