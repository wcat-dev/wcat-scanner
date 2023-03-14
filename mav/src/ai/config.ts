// extra configs for the image
export interface ImageConfig {
  width: number; // image width
  height: number; // image height
  img: string; // the base64 string of the image
  url?: string; // the url of the image
  cv?: boolean; // can perform Computer Vision
}

export interface ClassifyModelType {
  className: string;
  probability: number;
}
