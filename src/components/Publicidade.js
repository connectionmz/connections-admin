import React, { useState, useEffect } from 'react';
import { ref, push, set, onValue, remove, update } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../fb';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const Publicidade = () => {
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [editPostId, setEditPostId] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPost, setExpandedPost] = useState(null);

  // Módulos e configuração do ReactQuill
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'link', 'image'
  ];

  // Carregar posts ao montar o componente
  useEffect(() => {
    const postsRef = ref(db, 'blogPost');
    const unsubscribe = onValue(postsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const postsArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        postsArray.sort((a, b) => {
          const dateA = new Date(`${a.date} ${a.time}`);
          const dateB = new Date(`${b.date} ${b.time}`);
          return dateB - dateA;
        });
        setPosts(postsArray);
      } else {
        setPosts([]);
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Filtrar posts pelo termo de busca
  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Manipulador de upload de imagem
  const handleImageUpload = async (file) => {
    if (!file) return null;
    
    try {
      setIsUploading(true);
      const fileRef = storageRef(storage, `blogImages/${file.name}_${Date.now()}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      return url;
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      alert('Erro ao fazer upload da imagem. Por favor, tente novamente.');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Função para salvar ou atualizar um post
  const savePost = async () => {
    if (!title.trim() || !content.trim()) {
      alert("Título e conteúdo são obrigatórios!");
      return;
    }

    const now = new Date();
    const date = now.toLocaleDateString('pt-BR');
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    try {
      let imageUrlToSave = imageUrl;
      
      if (image) {
        imageUrlToSave = await handleImageUpload(image);
      }

      const postData = {
        title,
        content,
        date,
        time,
        ...(imageUrlToSave && { imageUrl: imageUrlToSave }),
      };

      if (editPostId) {
        const postRef = ref(db, `blogPost/${editPostId}`);
        await update(postRef, postData);
        setEditPostId(null);
      } else {
        const newPostRef = push(ref(db, 'blogPost'));
        await set(newPostRef, postData);
      }
      
      resetForm();
      setActiveTab('list');
    } catch (error) {
      console.error('Erro ao salvar o post:', error);
      alert('Erro ao salvar o post. Por favor, tente novamente.');
    }
  };

  // Função para resetar o formulário
  const resetForm = () => {
    setTitle('');
    setContent('');
    setImage(null);
    setImagePreview(null);
    setImageUrl('');
  };

  // Função para editar um post
  const editPost = (post) => {
    setTitle(post.title);
    setContent(post.content);
    setImageUrl(post.imageUrl || '');
    setEditPostId(post.id);
    setActiveTab('edit');
    setExpandedPost(null);
  };

  // Função para deletar um post com confirmação
  const deletePost = async (postId) => {
    if (window.confirm('Tem certeza que deseja excluir este post?')) {
      try {
        const postRef = ref(db, `blogPost/${postId}`);
        await remove(postRef);
        if (expandedPost === postId) {
          setExpandedPost(null);
        }
      } catch (error) {
        console.error('Erro ao deletar o post:', error);
        alert('Erro ao deletar o post. Por favor, tente novamente.');
      }
    }
  };

  // Manipulador de seleção de imagem
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setImageUrl('');
    }
  };

  // Função para compartilhar post
  const sharePost = (post) => {
    if (navigator.share) {
      navigator.share({
        title: post.title,
        text: post.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...',
        url: window.location.href,
      }).catch(() => {
        copyToClipboard(window.location.href);
        alert('Link copiado para a área de transferência!');
      });
    } else {
      copyToClipboard(window.location.href);
      alert('Link copiado para a área de transferência!');
    }
  };

  // Função para copiar texto para clipboard
  const copyToClipboard = (text) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  };

  // Toggle para expandir/colapsar post
  const toggleExpandPost = (postId) => {
    setExpandedPost(expandedPost === postId ? null : postId);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Posts</h1>
            <p className="text-gray-600">
              {activeTab === 'list' ? 'Visualize e gerencie seus posts' : editPostId ? 'Edite seu post' : 'Crie um novo post'}
            </p>
          </div>
          
          <div className="mt-4 md:mt-0">
            <button
              onClick={() => {
                resetForm();
                setEditPostId(null);
                setActiveTab(activeTab === 'list' ? 'edit' : 'list');
              }}
              className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium ${
                activeTab === 'list' 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {activeTab === 'list' ? 'Novo Post' : 'Voltar para Lista'}
            </button>
          </div>
        </div>

        {/* Conteúdo principal */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {activeTab === 'list' ? (
            <div className="p-6">
              {/* Barra de busca e filtros */}
              <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Buscar posts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  {filteredPosts.length} {filteredPosts.length === 1 ? 'post encontrado' : 'posts encontrados'}
                </div>
              </div>

              {/* Lista de posts em grid */}
              {filteredPosts.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="mt-2 text-lg font-medium text-gray-900">
                    Nenhum post encontrado
                  </h3>
                  <p className="mt-1 text-gray-500">
                    {searchTerm ? 'Tente ajustar sua busca' : 'Crie seu primeiro post clicando em "Novo Post"'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredPosts.map(post => (
                    <div key={post.id} className="border border-gray-200 rounded-lg overflow-hidden flex flex-col">
                      {post.imageUrl && (
                        <div className="h-48 bg-gray-100 overflow-hidden">
                          <img 
                            src={post.imageUrl} 
                            alt={post.title} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = '/placeholder-blog.jpg';
                            }}
                          />
                        </div>
                      )}
                      <div className="p-4 flex-grow flex flex-col">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">{post.title}</h2>
                        
                        <div className="text-xs text-gray-500 mb-3">
                          Publicado em: {post.date} às {post.time}
                        </div>
                        
                        <div 
                          className={`prose max-w-none text-gray-600 mb-4 ${expandedPost === post.id ? '' : 'line-clamp-3'}`}
                          dangerouslySetInnerHTML={{ __html: post.content }}
                        />
                        
                        <div className="mt-auto pt-3 border-t border-gray-100">
                          <div className="flex justify-between items-center">
                            <button
                              onClick={() => toggleExpandPost(post.id)}
                              className="text-sm text-indigo-600 hover:text-indigo-800"
                            >
                              {expandedPost === post.id ? 'Ver menos' : 'Ver completo'}
                            </button>
                            
                            <div className="flex space-x-2">
                              <button
                                onClick={() => sharePost(post)}
                                className="text-gray-500 hover:text-gray-700"
                                title="Compartilhar"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                              </button>
                              
                              <button
                                onClick={() => editPost(post)}
                                className="text-gray-500 hover:text-gray-700"
                                title="Editar"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              
                              <button
                                onClick={() => deletePost(post.id)}
                                className="text-red-500 hover:text-red-700"
                                title="Excluir"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-6">
              {/* Formulário de edição/criação (mantido igual) */}
              <div className="space-y-6">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                    Título do Post *
                  </label>
                  <input
                    type="text"
                    id="title"
                    placeholder="Digite um título atraente"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Imagem de Destaque
                  </label>
                  <div className="mt-1 flex items-center">
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        Selecionar Imagem
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="sr-only"
                      />
                    </label>
                    {image && (
                      <span className="ml-2 text-sm text-gray-500">{image.name}</span>
                    )}
                  </div>
                  {(imagePreview || imageUrl) && (
                    <div className="mt-2">
                      <img 
                        src={imagePreview || imageUrl} 
                        alt="Preview" 
                        className="max-h-48 rounded-md"
                      />
                    </div>
                  )}
                  <p className="mt-2 text-sm text-gray-500">
                    Adicione uma imagem chamativa para seu post (opcional)
                  </p>
                </div>

                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                    Conteúdo do Post *
                  </label>
                  <div className="mt-1">
                    <ReactQuill
                      value={content}
                      onChange={setContent}
                      modules={modules}
                      formats={formats}
                      theme="snow"
                      className="border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Escreva seu conteúdo aqui..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('list');
                      resetForm();
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={savePost}
                    disabled={isUploading || !title.trim() || !content.trim()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Salvando...
                      </>
                    ) : editPostId ? 'Atualizar Post' : 'Publicar Post'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Publicidade;