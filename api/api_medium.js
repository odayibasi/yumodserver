const bodyParser = require('body-parser');
const request = require("request");


exports.checkAccountFindAllMediumPostCreateStoryModelAndSaveS3 = (req, res) => {
    var postModel = { storyModel: { stories: [] }, req: req, res: res };
    findAllMediumPostAndFillModel(postModel);
}



function findAllMediumPostAndFillModel(postModel) {

    var pagingTo = postModel.pagingTo != undefined ? "&to=" + postModel.pagingTo : "";
    var url = "https://medium.com/_/api/users/67ea4f73fc7/profile/stream?source=latest&limit=100" + pagingTo;
    request(url, function(error, response, html) {
        // First we'll check to make sure no errors occurred when making the request
        if (!error) {
            var content = html.substring(16);
            var jContent = JSON.parse(content);
            var posts = jContent.payload.references.Post;
            if (jContent.payload.paging.next == undefined) { //Last Paging
                postModel.res.json(postModel.storyModel);
            } else {
                postModel.pagingTo = jContent.payload.paging.next.to;
                console.log(postModel.pagingTo);
                for (var pKey in posts) {
                    var pItem = posts[pKey];
                    var sUrl = "https//medium.com/p/" + pItem.uniqueSlug;
                    postModel.storyModel.stories.push({ sTitle: pItem.title, sUrl: sUrl });
                }
                findAllMediumPostAndFillModel(postModel);
            }
        }
    })
}