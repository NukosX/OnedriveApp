/**
 * Set parameters to PropertiesService<br>
 * At first, please set parameters using this. Access token is retrieved by the refresh token.<br>
 *<br>
 * If you don't have refresh token, don't worry. In this case, please set only client_id and client_secret.<br>
 * So please run this 'setProp(client_id, client_secret)'. And please paste following script.<br>
 *<br>
 * function doGet(){<br>
 *   var prop = PropertiesService.getScriptProperties();<br>
 *   return OnedriveApp.getAccesstoken(prop);<br>
 * }<br>
 *<br>
 * On the Script Editor -> Publish -> Deploy as Web App -> Click Test web app for your latest code.<br>
 * Please authorize by above process.<br>
 *<br>
 * @param {Object} PropertiesService.getScriptProperties()
 * @param {String} client_id
 * @param {String} client_secret
 * @param {String} redirect_uri
 * @param {String} refresh_token
 * @return {Object} return values from PropertiesService
 */
function setProp(prop, client_id, client_secret, redirect_uri, refresh_token){
    return new OnedriveApp(false, prop).setprop(client_id, client_secret, redirect_uri, refresh_token);
}

/**
 * Create OnedriveApp instance<br>
 * @param {Object} PropertiesService.getScriptProperties()
 * @return {OnedriveApp} return instance of OnedriveApp
 */
function init(prop) {
    return new OnedriveApp(true, prop);
}


/**
 * Retrieve access token and refresh token<br>
 * @param {Object} PropertiesService.getScriptProperties()
 * @return {HTML} return HTML code with retrieved access token and refresh token
 */
function getAccesstoken(prop, e) {
    var OA = new OnedriveApp(false, prop);
    if (!e.length) {
        return OA.doGet();
    } else if (e.length > 1) {
        if (e[0] == "doget") {
            OA.saveRefreshtoken(JSON.parse(e[1]).refresh_token);
        }
    }
    return;
}


/**
 * Retrieve authorization code.<br>
 * This is automatically used by this library.<br>
 * @param {Object} JSON data with authorization code
 * @return {HTML} return HTML code with access token
 */
function getCode(e) {
    return new OnedriveApp(false).callback(e);
}
;
(function(r) {
  var OnedriveApp;
  OnedriveApp = (function() {
    var convToGoogle, convToMicrosoft, fetch, getaccesstoken, getparams;

    OnedriveApp.name = "OnedriveApp";

    function OnedriveApp(d, p) {
      this.authurl = "https://login.microsoftonline.com/common/oauth2/v2.0/";
      this.p = p;
      if (d) {
        this.prop = this.p.getProperties();
        this.client_id = this.prop.client_id;
        this.client_secret = this.prop.client_secret;
        this.redirect_uri = this.prop.redirect_uri;
        this.refresh_token = this.prop.refresh_token;
        this.access_token = getaccesstoken.call(this);
        this.baseurl = "https://graph.microsoft.com/v1.0";
        this.maxchunk = 10485760;
        this.sheeturl = "https://graph.microsoft.com/beta/me/drive/items/";
        if (this.refresh_token == null) {
          throw new Error("No refresh token. Please save refresh token by 'OnedriveApp.saveRefreshtoken(prop, refresh_token)'.");
        }
      }
    }

    OnedriveApp.prototype.setprop = function(client_id, client_secret, redirect_uri, refresh_token) {
      this.p.setProperties({
        client_id: client_id,
        client_secret: client_secret,
        redirect_uri: redirect_uri,
        refresh_token: refresh_token,
        scope: "offline_access files.readwrite.all files.readwrite files.read"
      });
      return JSON.stringify(this.p.getProperties());
    };

    OnedriveApp.prototype.saveRefreshtoken = function(refresh_token_) {
      if (refresh_token_ == null) {
        throw new Error("No refresh token.");
      }
      this.p.setProperties({
        refresh_token: refresh_token_
      });
      return JSON.stringify(this.p.getProperties());
    };

    OnedriveApp.prototype.doGet = function() {
      var appurl, ermsg, html, name, param, prop, qparams, url, value;
      prop = this.p.getProperties();
      if ((prop.client_id == null) || (prop.client_secret == null) || !prop.client_id || !prop.client_secret) {
        ermsg = "Error: Please set client_id and client_secret to ScriptProperties using 'OnedriveApp.setProp(client_id, client_secret)'.\n";
        return HtmlService.createHtmlOutput(ermsg);
      }
      url = this.authurl + "authorize";
      param = {
        response_type: "code",
        client_id: prop.client_id,
        redirect_uri: (function(p1) {
          var rurl;
          this.p = p1;
          rurl = ScriptApp.getService().getUrl();
          rurl = rurl.indexOf("/exec") >= 0 ? rurl = rurl.slice(0, -4) + 'usercallback' : rurl.slice(0, -3) + 'usercallback';
          this.p.setProperties({
            redirect_uri: rurl
          });
          return rurl;
        })(this.p),
        scope: prop.scope,
        state: ScriptApp.newStateToken().withArgument('client_id', prop.client_id).withArgument('client_secret', prop.client_secret).withArgument('redirect_uri', this.p.getProperties().redirect_uri).withMethod("OnedriveApp.getCode").withTimeout(300).createToken()
      };
      qparams = "?";
      for (name in param) {
        value = param[name];
        qparams += name + "=" + encodeURIComponent(value) + "&";
      }
      appurl = "https://apps.dev.microsoft.com/#/application/" + prop.client_id;
      html = "<p>Please push this button after set redirect_uri to '<b>" + param.redirect_uri + "</b>' at <a href=\"" + appurl + "\" target=\"_blank\">your application</a>.</p>";
      html += "<input type=\"button\" value=\"Get access token\" onclick=\"window.open('" + url + qparams + "', 'Authorization', 'width=500,height=600');\">";
      return HtmlService.createHtmlOutput(html);
    };

    OnedriveApp.prototype.callback = function(e) {
      var ermsg, method, payload, res, t, url;
      if (e.parameter.code == null) {
        ermsg = "Error: Please confirm client_id, client_secret and redirect_uri, again.\n";
        ermsg += "client_id, client_secret and redirect_uri you set are as follows.\n";
        ermsg += "client_id : " + e.parameter.client_id + "\n";
        ermsg += "client_secret : " + e.parameter.client_secret + "\n";
        ermsg += "redirect_uri : " + e.parameter.redirect_uri + "\n";
        return HtmlService.createHtmlOutput(ermsg);
      }
      url = this.authurl + "token";
      method = "post";
      payload = {
        client_id: e.parameter.client_id,
        client_secret: e.parameter.client_secret,
        redirect_uri: e.parameter.redirect_uri,
        code: e.parameter.code,
        grant_type: "authorization_code"
      };
      res = fetch.call(this, url, method, payload, null);
      t = HtmlService.createTemplateFromFile('doget');
      t.data = res;
      return t.evaluate();
    };

    OnedriveApp.prototype.getESheet = function(id) {
      var headers, method, res, url;
      url = this.sheeturl + id + "/workbook/worksheets";
      method = "get";
      headers = {
        "Authorization": "Bearer " + this.access_token
      };
      res = fetch.call(this, url, method, null, headers, null);
      return res;
    };

    OnedriveApp.prototype.getAt = function() {
      return this.access_token;
    };

    OnedriveApp.prototype.createSession = function(path) {
      var headers, method, res, url;
      url = this.sheeturl + "root:/" + path + ":/workbook/";
      method = "get";
      headers = {
        "Authorization": "Bearer " + this.access_token
      };
      res = fetch.call(this, url, method, null, headers, null);
      return res;
    };

    OnedriveApp.prototype.getFilelist = function(folder) {
      var headers, method, res, url;
      url = this.baseurl + "/drive/items/root" + (folder ? ":/" + folder : "") + "?expand=children(select=id,name)";
      method = "get";
      headers = {
        "Authorization": "Bearer " + this.access_token
      };
      res = fetch.call(this, url, method, null, headers, null);
      return res.children;
    };

    OnedriveApp.prototype.downloadFile = function(path_, conv_, googlefolderId_) {
      var blob, dfile, fileId_, filename, folder, folderName, headers, method, query, url;
      if (path_ == null) {
        throw new Error("No path.");
      }
      if (conv_ == null) {
        conv_ = false;
      }
      if (googlefolderId_ == null) {
        googlefolderId_ = false;
      }
      fileId_ = "";
      folderName = "root";
      url = this.baseurl + "/me/drive/root:" + path_ + ":/content";
      method = "get";
      headers = {
        "Authorization": "Bearer " + this.access_token
      };
      blob = fetch.call(this, url, method, null, headers, null);
      filename = path_.substring(path_.lastIndexOf('/') + 1, path_.length);
      if (googlefolderId_) {
        folder = DriveApp.getFolderById(googlefolderId_);
        fileId_ = folder.createFile(blob).setName(filename).getId();
        folderName = folder.getName();
      } else {
        fileId_ = DriveApp.createFile(blob).setName(filename).getId();
      }
      if (conv_) {
        dfile = fileId_;
        fileId_ = convToGoogle.call(this, dfile);
        if (googlefolderId_) {
          query = "?addParents=" + googlefolderId_;
          query += "&removeParents=" + DriveApp.getFileById(fileId_).getParents().next().getId();
          url = "https://www.googleapis.com/drive/v3/files/" + fileId_ + query;
          headers = {
            "Authorization": "Bearer " + ScriptApp.getOAuthToken()
          };
          method = "patch";
          fetch.call(this, url, method, null, headers, null);
        }
        url = "https://www.googleapis.com/drive/v3/files/" + dfile;
        headers = {
          "Authorization": "Bearer " + ScriptApp.getOAuthToken()
        };
        method = "delete";
        fetch.call(this, url, method, null, headers, null);
      }
      return filename + " (fileId = " + fileId_ + ") was downloaded to " + folderName + " folder on your Google Drive.";
    };

    OnedriveApp.prototype.uploadFile = function(fileid_, path_) {
      var ar, byteAr, file, fileinf, filepath, filesize, headers, j, len, method, payload, ref, res, result, st, url;
      if (fileid_ == null) {
        throw new Error("No file ID.");
      }
      path_ = path_ == null ? "/" : path_;
      fileinf = (ref = convToMicrosoft.call(this, fileid_)) != null ? ref : [fileid_, DriveApp.getFileById(fileid_).getName()];
      file = DriveApp.getFileById(fileinf[0]);
      filesize = 0;
      byteAr = [];
      if (!~file.getMimeType().indexOf("google-apps.script")) {
        byteAr = file.getBlob().getBytes();
        filesize = byteAr.length;
      } else {
        throw new Error("Cannot upload '" + fileinf[0] + "'.");
      }
      ar = getparams.call(this, filesize);
      filepath = path_ + fileinf[1];
      url = this.baseurl + "/drive/root:" + filepath + ":/createUploadSession";
      headers = {
        "Authorization": "Bearer " + this.access_token,
        "Content-Type": "application/json"
      };
      method = "post";
      payload = '{"item": {"@microsoft.graph.conflictBehavior": "rename", "name": "' + fileinf[1] + '"}}';
      url = (fetch.call(this, url, method, payload, headers, null)).uploadUrl;
      method = "put";
      res = [];
      for (j = 0, len = ar.length; j < len; j++) {
        st = ar[j];
        headers = {
          "Content-Range": st.cr
        };
        payload = byteAr.slice(st.bstart, st.bend + 1);
        res.push(fetch.call(this, url, method, payload, headers, st.clen));
      }
      result = res[res.length - 1];
      if (fileinf[0] !== fileid_) {
        url = "https://www.googleapis.com/drive/v3/files/" + fileinf[0];
        headers = {
          "Authorization": "Bearer " + ScriptApp.getOAuthToken()
        };
        method = "delete";
        fetch.call(this, url, method, null, headers, null);
      }
      return {
        name: result.name,
        id: result.id,
        size: result.size,
        createdDateTime: result.createdDateTime
      };
    };

    OnedriveApp.prototype.creatFolder = function(foldername_, path_) {
      var headers, method, payload, result, url;
      if (foldername_ == null) {
        throw new Error("No folder name.");
      }
      url = path_ ? this.baseurl + "/drive/root:" + path_ + ":/children" : this.baseurl + "/drive/root/children";
      headers = {
        "Authorization": "Bearer " + this.access_token,
        "Content-Type": "application/json"
      };
      method = "post";
      payload = '{"name": "' + foldername_ + '", "folder": { }}';
      result = fetch.call(this, url, method, payload, headers, null);
      return {
        folderName: result.name,
        id: result.id,
        parentInf: result.parentReference.path
      };
    };

    OnedriveApp.prototype.deleteItemByName = function(path_) {
      var headers, method, result, url;
      if (path_ == null) {
        throw new Error("No path to item on OneDrive.");
      }
      if (path_.slice(-1) === "/") {
        path_ = path_.slice(0, -1);
      }
      url = this.baseurl + "/drive/root:" + path_;
      headers = {
        "Authorization": "Bearer " + this.access_token
      };
      method = "delete";
      result = fetch.call(this, url, method, null, headers, null);
      if (result.error != null) {
        return result;
      } else {
        return {
          message: "'/root" + path_ + "' was deleted."
        };
      }
    };

    OnedriveApp.prototype.deleteItemById = function(id_) {
      var headers, method, result, url;
      if (id_ == null) {
        throw new Error("No item id.");
      }
      url = this.baseurl + "/drive/items/" + id_;
      headers = {
        "Authorization": "Bearer " + this.access_token
      };
      method = "delete";
      result = fetch.call(this, url, method, null, headers, null);
      if (result.error != null) {
        return result;
      } else {
        return {
          message: "'" + id_ + "' was deleted."
        };
      }
    };

    OnedriveApp.prototype.convToMicrosoftDo = function(id_) {
      return convToMicrosoft.call(this, id_);
    };

    OnedriveApp.prototype.convToGoogleDo = function(id_, filename_) {
      return convToGoogle.call(this, id_);
    };

    convToGoogle = function(fileId_) {
      var ToMime, boundary, data, fields, file, filename, headers, metadata, method, mime, payload, res, url;
      if (fileId_ == null) {
        throw new Error("No file ID.");
      }
      file = DriveApp.getFileById(fileId_);
      filename = file.getName();
      mime = file.getMimeType();
      ToMime = "";
      switch (mime) {
        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          ToMime = "application/vnd.google-apps.document";
          break;
        case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
          ToMime = "application/vnd.google-apps.spreadsheet";
          break;
        case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
          ToMime = "application/vnd.google-apps.presentation";
          break;
        default:
          return null;
      }
      metadata = {
        name: filename,
        mimeType: ToMime
      };
      fields = "id,mimeType,name";
      url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=" + encodeURIComponent(fields);
      boundary = "xxxxxxxxxx";
      data = "--" + boundary + "\r\n";
      data += "Content-Disposition: form-data; name=\"metadata\";\r\n";
      data += "Content-Type: application/json; charset=UTF-8\r\n\r\n";
      data += JSON.stringify(metadata) + "\r\n";
      data += "--" + boundary + "\r\n";
      data += "Content-Disposition: form-data; name=\"file\"; filename=\"" + filename + "\"\r\n";
      data += "Content-Type: " + mime + "\r\n\r\n";
      payload = Utilities.newBlob(data).getBytes().concat(file.getBlob().getBytes()).concat(Utilities.newBlob("\r\n--" + boundary + "\r\n").getBytes());
      headers = {
        "Authorization": "Bearer " + ScriptApp.getOAuthToken(),
        "Content-Type": "multipart/related; boundary=" + boundary
      };
      method = "post";
      res = fetch.call(this, url, method, payload, headers, null);
      return res.id;
    };

    convToMicrosoft = function(fileId_) {
      var blob, deffilename, ext, file, fileid, filename, format, headers, method, mime, url;
      if (fileId_ == null) {
        throw new Error("No file ID.");
      }
      file = DriveApp.getFileById(fileId_);
      mime = file.getMimeType();
      format = "";
      ext = "";
      switch (mime) {
        case "application/vnd.google-apps.document":
          format = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          ext = ".docx";
          break;
        case "application/vnd.google-apps.spreadsheet":
          format = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
          ext = ".xlsx";
          break;
        case "application/vnd.google-apps.presentation":
          format = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
          ext = ".pptx";
          break;
        default:
          return null;
      }
      url = "https://www.googleapis.com/drive/v3/files/" + fileId_ + "/export?mimeType=" + format;
      headers = {
        "Authorization": "Bearer " + ScriptApp.getOAuthToken()
      };
      method = "get";
      blob = fetch.call(this, url, method, null, headers, null);
      deffilename = file.getName();
      filename = ~deffilename.indexOf(ext) ? deffilename : deffilename + ext;
      fileid = DriveApp.createFile(blob).setName(filename).getId();
      return [fileid, filename];
    };

    getparams = function(filesize) {
      var allsize, ar, bend, bstart, clen, cr, i, j, ref, ref1, sep;
      allsize = filesize;
      sep = allsize < this.maxchunk ? allsize : this.maxchunk - 1;
      ar = [];
      for (i = j = 0, ref = allsize - 1, ref1 = sep; ref1 > 0 ? j <= ref : j >= ref; i = j += ref1) {
        bstart = i;
        bend = i + sep - 1 < allsize ? i + sep - 1 : allsize - 1;
        cr = 'bytes ' + bstart + '-' + bend + '/' + allsize;
        clen = bend !== allsize - 1 ? sep : allsize - i;
        ar.push({
          bstart: bstart,
          bend: bend,
          cr: cr,
          clen: clen
        });
      }
      return ar;
    };

    getaccesstoken = function() {
      var method, payload, res, url;
      url = this.authurl + "token";
      method = "post";
      payload = {
        client_id: this.client_id,
        client_secret: this.client_secret,
        redirect_uri: this.redirect_uri,
        refresh_token: this.refresh_token,
        grant_type: "refresh_token"
      };
      res = fetch.call(this, url, method, payload, null, null);
      this.access_token = res.access_token;
      if (this.access_token === null || this.access_token === "") {
        throw new Error("At first, please run setProp().");
      }
      return res.access_token;
    };

    fetch = function(url, method, payload, headers, contentLength) {
      var e, res;
      try {
        res = UrlFetchApp.fetch(url, {
          method: method,
          payload: payload,
          headers: headers,
          contentLength: contentLength,
          muteHttpExceptions: true
        });
      } catch (error) {
        e = error;
        throw new Error(e);
      }
      try {
        r = JSON.parse(res.getContentText());
      } catch (error) {
        e = error;
        r = res.getBlob();
      }
      return r;
    };

    return OnedriveApp;

  })();
  return r.OnedriveApp = OnedriveApp;
})(this);
