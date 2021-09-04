import {Chapter,
    LanguageCode,
    Manga,
    MangaStatus,
    MangaTile,
    Tag,
    TagSection} from 'paperback-extensions-common'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const entities = require('entities')

export class Parser {


    parseMangaDetails($: any, mangaId: string): Manga {


        const titles = [this.decodeHTMLEntity($('.font-bold.text-lg').text().trim())]
        const image = $('.lazy').attr('data-src')
        const summary = $('p.text-sm.text-color-text-secondary').text().trim()

        let status = MangaStatus.ONGOING, released, rating = 0
        let tagArray0: Tag[] = []
        let tagArray1: Tag[] = []
        for (const obj of $('a[href*=genre]').toArray()) {
            const id = $(obj).attr('href')?.replace('/search?genre=', '').trim()
            const label = $(obj).text().trim()
            if (typeof id === 'undefined' || typeof label === 'undefined') continue
            tagArray0 = [...tagArray0, createTag({id: id, label: $(obj).text().trim()})]
        }
        let i = 0
        for (const item of $('div', $('.grid.grid-cols-1.gap-3.mb-3')).toArray()) {
            const descObj = $('div', $(item))
            if (!descObj.html()) {
                continue
            }
            switch (i) {
                case 0: {
                    // Manga Type
                    tagArray1 = [...tagArray1, createTag({
                        id: descObj.text().trim(),
                        label: descObj.text().trim().replace(/^\w/, (c: string) => c.toUpperCase())
                    })]
                    i++
                    continue
                }
                case 1: {
                    // Manga Status
                    if (descObj.text().trim().toLowerCase().includes('publishing')) {
                        status = MangaStatus.ONGOING
                    } else {
                        status = MangaStatus.COMPLETED
                    }
                    i++
                    continue
                }
                case 2: {
                    // Date of release
                    released = descObj.text().trim() ?? undefined
                    i++
                    continue
                }
                case 3: {
                    // Rating
                    rating = Number(descObj.text().trim().replace(' / 10', '')) ?? undefined
                    i++
                    continue
                }
            }
            i = 0
        }
        const tagSections: TagSection[] = [createTagSection({id: '0', label: 'genres', tags: tagArray0}),
            createTagSection({id: '1', label: 'format', tags: tagArray1})]
        return createManga({
            id: mangaId,
            rating: rating,
            titles: titles,
            image: image ?? '',
            status: status,
            tags: tagSections,
            desc: this.decodeHTMLEntity(summary ?? ''),
            lastUpdate: released
        })
    }


    parseChapterList($: any, mangaId: string): Chapter[] {

        const chapters: Chapter[] = []

        for (const obj of $('a.border.border-color-border-primary.p-1').toArray()) {
            const chapterId = $(obj).attr('href')
            if (chapterId == 'Read Chapters') {
                continue
            }
            const chapName = $(obj).text()
            const chapVol = Number(chapName?.toLowerCase()?.match(/season \D*(\d*\.?\d*)/)?.pop())
            const chapNum = Number(chapName?.toLowerCase()?.match(/chapter \D*(\d*\.?\d*)/)?.pop())

            if (typeof chapterId === 'undefined') continue
            chapters.push(createChapter({
                id: chapterId,
                mangaId: mangaId,
                chapNum: Number.isNaN(chapNum) ? 0 : chapNum,
                volume: Number.isNaN(chapVol) ? 0 : chapVol,
                langCode: LanguageCode.ENGLISH,
                name: this.decodeHTMLEntity(chapName)
            }))
        }
        return chapters
    }


    parseChapterDetails($: any): string[] {
        const pages: string[] = []
        // Get all of the pages
        for (const obj of $('img', $('picture')).toArray()) {
            const page = $(obj).attr('data-src')
            if (typeof page === 'undefined') continue
            pages.push(page)
        }
        return pages
    }

    filterUpdatedManga($: any, time: Date, ids: string[]): { updates: string[], loadNextPage: boolean } {
        const foundIds: string[] = []
        let passedReferenceTime = false
        for (const item of $('div.flex.bg-color-bg-secondary.p-2.rounded').toArray()) {
            const id = $('a.inilne.block', item).attr('href')?.replace('/manga/', '') ?? ''
            const mangaTime = new Date($('time-ago', item).attr('datetime') ?? '')
            passedReferenceTime = mangaTime <= time
            if (!passedReferenceTime) {
                if (ids.includes(id)) {
                    foundIds.push(id)
                }
            } else break
        }
        if (!passedReferenceTime) {
            return {updates: foundIds, loadNextPage: true}
        } else {
            return {updates: foundIds, loadNextPage: false}
        }


    }

    parseSearchResults($: any): MangaTile[] {
        const mangaTiles: MangaTile[] = []
        const collectedIds: string[] = []
        for (const obj of $('div', $('.grid.gap-3')).toArray()) {
            const id = $('a', $(obj)).attr('href')?.replace('/manga/', '')
            const titleText = this.decodeHTMLEntity($('a', $('div', $(obj))).text())

            const image = $('img', $('a', $(obj))).attr('data-src')

            if (typeof id === 'undefined' || typeof image === 'undefined') continue
            if (!collectedIds.includes(id)) {
                mangaTiles.push(createMangaTile({
                    id: id,
                    title: createIconText({text: titleText}),
                    image: image
                }))
                collectedIds.push(id)
            }
        }
        return mangaTiles
    }

    parseTags($: any): TagSection[] {
        const tagSections: TagSection[] = [createTagSection({id: '0', label: 'Genres', tags: []}),
            createTagSection({id: '1', label: 'Format', tags: []})]

        for (const obj of $('.grid.gap-1 label').toArray()) {
            const genre = $(obj).text().trim()
            const id = '&genre=' + $('input', $(obj)).attr('value') ?? genre
            tagSections[0]?.tags.push(createTag({id: id, label: genre}))
        }

        for (const obj of $('select#type option:not([value=""])').toArray()) {
            let genre = $(obj).text().trim()

            // Capitalize first letter
            genre = genre.charAt(0).toUpperCase() + genre.slice(1)

            const id = '&type=' + $(obj).attr('value') ?? genre
            tagSections[1]?.tags.push(createTag({id: id, label: genre}))
        }

        for (const obj of $('select#status option:not([value=""])').toArray()) {

            let genre = $(obj).text().trim()
            // Capitalize first letter
            genre = genre.charAt(0).toUpperCase() + genre.slice(1)

            const id = '&status=' + $(obj).attr('value') ?? genre
            tagSections[1]?.tags.push(createTag({id: id, label: genre}))
        }

        return tagSections
    }

    parsePopularSection($: any): MangaTile[] {
        const mangaTiles: MangaTile[] = []
        const collectedIds: string[] = []
        for (const obj of $('div', $('.grid.gap-3')).toArray()) {
            const id = $('a', $(obj)).attr('href')?.replace('/manga/', '')
            const titleText = this.decodeHTMLEntity($('a', $('div', $(obj))).text())
            
            const image = $('img', $('a', $(obj))).attr('data-src')

            if (typeof id === 'undefined' || typeof image === 'undefined') continue
            if (!collectedIds.includes(id)) {
                mangaTiles.push(createMangaTile({
                    id: id,
                    title: createIconText({text: titleText}),
                    image: image
                }))
                collectedIds.push(id)
            }
        }
        return mangaTiles
    }

    // Add featured section back in whenever a section type for that comes around

    /*
    parseFeaturedSection($ : CheerioSelector): MangaTile[]{
      let mangaTiles: MangaTile[] = []
      for(let obj of $('div[class=relative]').toArray()) {
        let href = ($('a', $(obj)).attr('href') ?? '')
        let id = href.split('-')[0].split('/').pop() + '/' + href.split('/').pop()?.split('-chapter')[0].trim()
        let titleText = this.decodeHTMLEntity($('.text-sm', $('.text-color-text-fire-ch', $('div', $(obj)))).text())

        let image = $('img', $('div', $(obj))).attr('data-src')

        let collectedIds: string[] = []
        if (typeof id === 'undefined' || typeof image === 'undefined') continue
        if(!collectedIds.includes(id)) {
          mangaTiles.push(createMangaTile({
            id: id,
            title: createIconText({text: titleText}),
            image: image
        }))
        collectedIds.push(id)
        }
      }
      return mangaTiles
    }
    */
    parseRecentUpdatesSection($: any): MangaTile[] {
        const mangaTiles: MangaTile[] = []
        const collectedIds: string[] = []
        for (const obj of $('div.flex.bg-color-bg-secondary.p-2.rounded').toArray()) {
            const id = $('a.inilne.block', obj).attr('href')?.replace('/manga/', '')
            const titleText = this.decodeHTMLEntity($('a.inilne.block', obj).text())

            const image = $('img', $('a', $(obj))).attr('data-src')

            if (typeof id === 'undefined' || typeof image === 'undefined') continue
            if (!collectedIds.includes(id)) {
                mangaTiles.push(createMangaTile({
                    id: id,
                    title: createIconText({text: titleText}),
                    image: image
                }))
                collectedIds.push(id)
            }
        }
        return mangaTiles
    }

    isLastPage($: any): boolean {
        return $('a:contains("Next")').length < 1
    }
    
    decodeHTMLEntity(str: string): string {
        return str.replace(/&#(\d+);/g, (_match, dec) => {
            return entities.decodeHTML(String.fromCharCode(dec))
        })
    }
}
