import React, { useState } from 'react';
import { usePost } from '../../context/PostContext';
import searchStyles from '../../styles/components/Search.module.css';

const SearchBar = () => {
    const [query, setQuery] = useState('');
    const { searchPosts, fetchPosts } = usePost();

    const handleSearch = async (e) => {
        e.preventDefault();
        if (query.trim()) {
            await searchPosts(query.trim());
        } else {
            await fetchPosts();
        }
    };

    const handleClear = async () => {
        setQuery('');
        await fetchPosts();
    };

    return (
        <div className={searchStyles.searchContainer}>
            <form onSubmit={handleSearch} className={searchStyles.searchForm}>
                <div className={searchStyles.searchInput}>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search posts, hashtags, locations..."
                        className={searchStyles.input}
                    />
                    {query && (
                        <button 
                            type="button" 
                            onClick={handleClear}
                            className={searchStyles.clearBtn}
                        >
                            ✕
                        </button>
                    )}
                </div>
                <button type="submit" className={searchStyles.searchBtn}>
                    🔍
                </button>
            </form>
        </div>
    );
};

export default SearchBar;
