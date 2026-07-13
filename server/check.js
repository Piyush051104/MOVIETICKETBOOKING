import connectDB from './config/db.js';
import Movie from './model/Movie.js';
import 'dotenv/config';

async function check() {
    await connectDB();
    const movies = await Movie.find({});
    console.log("MOVIES IN DB:");
    movies.forEach(m => console.log("- " + m.title));
    process.exit(0);
}
check();
