var PROTO_PATH = __dirname + "/.proto/route_guide.proto";
console.log("__dirname", __dirname, PROTO_PATH);
var grpc = require("@grpc/grpc-js");
var protoLoader = require("@grpc/proto-loader");
// Suggested options for similarity to existing grpc.load behavior
var packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
var protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
// The protoDescriptor object has the full package hierarchy
var routeguide = protoDescriptor.routeguide;

const stub = new routeguide.RouteGuide(
  "localhost:9010",
  grpc.credentials.createInsecure()
);

//IMP -> due to dynamic code-gen - we can define all the types as objects
var point = { latitude: 407838351, longitude: -746143763 };
// stub.getFeature(point, function (err, feature) {
//   if (err) {
//     // process error
//     console.log("grpcError", err);
//   } else {
//     // process feature
//     console.log("grpcFeature", feature);
//   }
// });

const reqmetadata = new grpc.Metadata();
reqmetadata.set("returnLen", 3);
stub.GetFeatures(point, reqmetadata, function (err, feature) {
  if (err) {
    // process error
    console.log("grpcError", err);
  } else {
    // process feature
    console.log("grpcFeatures new", feature);
  }
});
//above is example of dynamic code gen -> no need to generate the code

//to use defined types - we can either use TS Code gen or normal Node Static CodeGen Example
//NodeJS Static Code Gen Example by some guy - https://github.com/sergiommarcial/protobuf-nodejs-example
//NodeJS GRPC Examples =>  https://github.com/grpc/grpc-node/tree/%40grpc/grpc-js%401.9.0/examples/routeguide
