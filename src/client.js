import axios from "axios";

export const createClient = ({base}) => axios.create({
  baseURL: base
});