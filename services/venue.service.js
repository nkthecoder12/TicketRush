import pool from "../config/db.js"

export const createVenueService=async (data) => {
    

    const query=`insert into venues(name,address,city,capacity) values($1,$2,$3,$4) returning *`

    const values=[data.name,data.address,data.city,data.capacity];

    const result=await pool.query(query,values);


    return result.rows[0];












}



export const getVenuesService = async () => {
  const query = `
    SELECT *
    FROM venues
    ORDER BY id DESC
  `;

  const result = await pool.query(query);

  return result.rows;
};



export const getVenuesByIdService=async (id) => {
  
    const query= `
    SELECT *
    FROM venues where id =$1
    ORDER BY id DESC
  `
    const result=await pool.query(query,[id]);


    return result.rows[0];



}


export const updateVenueService=async (data) => {
    
    const query=`update venues set name=coalesce($1 , name),address=coalesce($2,address), city=coalesce($3,city),capacity=coalesce($4,capacity) `


    const values=[
      data.name


    ]
    





}